/*
  ==========================================
  FLIXSTAR CLOUD SYNC
  ==========================================

  Keeps every "flixstar-*" localStorage key (lists, watch progress,
  watched flags, settings) in sync across devices for a signed-in user.

  Backend: Supabase (free tier). Sign-in is passwordless by email:
  the user gets a 6-digit code (or a magic link) and is signed in.

  Required client env vars (Vercel → Project → Settings → Environment Variables):
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY

  Database setup: see supabase/schema.sql in the repo.

  Strategy:
    - First sign-in on a device: local data is MERGED with cloud data
      so nothing saved as a guest is lost.
    - After that: whichever side changed last wins (so deletions sync too).
    - Local changes are pushed ~1.5s after they happen.
    - Cloud changes are pulled on load, on tab focus, and every 60s.
*/

import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const syncConfigured = Boolean(URL_ && ANON);

export const supabase = syncConfigured
  ? createClient(URL_, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // PKCE: the email link carries a one-time code that only the device
        // that requested sign-in can redeem. We handle /auth/callback
        // ourselves so the link works in any browser (see handoff below).
        flowType: 'pkce',
        detectSessionInUrl: false,
        storageKey: 'sb-flixstar-auth'
      }
    })
  : null;

const PREFIX = 'flixstar-';
const META_KEY = 'flixstar-sync-meta'; // never synced itself
const TABLE = 'user_data';

// Keys that only make sense on one device
const LOCAL_ONLY = new Set([META_KEY]);

const isSyncedKey = key =>
  typeof key === 'string' && key.startsWith(PREFIX) && !LOCAL_ONLY.has(key);

/* ---------- state + listeners ---------- */

let state = {
  configured: syncConfigured,
  user: null,
  status: syncConfigured ? 'idle' : 'disabled', // idle | syncing | synced | error | disabled
  lastSyncedAt: readMeta().lastSyncedAt || null,
  error: '',
  pendingLogin: null, // {h,email,at} while waiting for the email link
  loginError: ''
};

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}

export function getSyncState() {
  return state;
}

export function subscribeSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- meta (per device) ---------- */

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMeta(patch) {
  const next = { ...readMeta(), ...patch };
  rawSet(META_KEY, JSON.stringify(next));
  return next;
}

/* ---------- local snapshot helpers ---------- */

const rawSet = Storage.prototype.setItem.bind(localStorage);
const rawRemove = Storage.prototype.removeItem.bind(localStorage);

function snapshotLocal() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isSyncedKey(key)) data[key] = localStorage.getItem(key);
  }
  return data;
}

function applyToLocal(data) {
  // Remove synced keys that no longer exist in the cloud copy
  const existing = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isSyncedKey(key)) existing.push(key);
  }
  existing.forEach(key => {
    if (!(key in data)) rawRemove(key);
  });

  Object.entries(data || {}).forEach(([key, value]) => {
    if (isSyncedKey(key) && typeof value === 'string') rawSet(key, value);
  });

  // Let the app re-read everything
  window.dispatchEvent(new Event('flixstar-sync-applied'));
  window.dispatchEvent(new Event('flixstar-watch-progress'));
  window.dispatchEvent(new Event('flixstar-watched'));
}

/* ---------- merge (used on first sign-in per device) ---------- */

const parse = v => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const itemKey = x =>
  `${x?.media_type || (x?.first_air_date ? 'tv' : 'movie')}-${x?.id}`;

function mergeLists(a, b) {
  const A = Array.isArray(a) ? a : [];
  const B = Array.isArray(b) ? b : [];
  const byId = new Map();

  [...A, ...B].forEach(list => {
    if (!list?.id) return;
    const prev = byId.get(list.id);
    if (!prev) {
      byId.set(list.id, { ...list, items: [...(list.items || [])] });
      return;
    }
    const seen = new Set(prev.items.map(itemKey));
    (list.items || []).forEach(item => {
      if (!seen.has(itemKey(item))) {
        prev.items.push(item);
        seen.add(itemKey(item));
      }
    });
  });

  return [...byId.values()];
}

function mergeProgress(a, b) {
  const key = x => `${x.type}-${x.id}-${x.season || 0}-${x.episode || 0}`;
  const map = new Map();
  [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(x => {
    if (!x) return;
    const prev = map.get(key(x));
    if (!prev || (x.updatedAt || 0) > (prev.updatedAt || 0)) map.set(key(x), x);
  });
  return [...map.values()];
}

function mergeData(local, remote) {
  const out = { ...remote, ...local };

  if (local['flixstar-lists'] || remote['flixstar-lists']) {
    out['flixstar-lists'] = JSON.stringify(
      mergeLists(parse(remote['flixstar-lists']), parse(local['flixstar-lists']))
    );
  }

  if (local['flixstar-watch-progress'] || remote['flixstar-watch-progress']) {
    out['flixstar-watch-progress'] = JSON.stringify(
      mergeProgress(
        parse(remote['flixstar-watch-progress']),
        parse(local['flixstar-watch-progress'])
      )
    );
  }

  // Settings: prefer the cloud copy so a new device adopts your setup
  if (remote['flixstar-settings']) {
    out['flixstar-settings'] = JSON.stringify({
      ...(parse(local['flixstar-settings']) || {}),
      ...(parse(remote['flixstar-settings']) || {})
    });
  }

  return out;
}

/* ---------- cloud I/O ---------- */

async function fetchRemote(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null if no row yet
}

async function pushRemote(userId, data) {
  const updated_at = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data, updated_at }, { onConflict: 'user_id' });
  if (error) throw error;
  return updated_at;
}

/* ---------- sync loop ---------- */

let pushTimer = null;
let busy = false;

function markDirty() {
  if (!state.user) return;
  writeMeta({ dirty: true, localChangedAt: Date.now() });
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(), 1500);
}

export async function syncNow() {
  if (!supabase || !state.user || busy) return;
  busy = true;
  setState({ status: 'syncing', error: '' });

  try {
    const userId = state.user.id;
    const meta = readMeta();
    const remote = await fetchRemote(userId);
    const local = snapshotLocal();
    const remoteTime = remote?.updated_at ? Date.parse(remote.updated_at) : 0;

    let updatedAt;

    if (meta.userId !== userId) {
      // First time this account syncs on this device → merge both sides
      const merged = remote ? mergeData(local, remote.data || {}) : local;
      applyToLocal(merged);
      updatedAt = await pushRemote(userId, merged);
    } else if (meta.dirty) {
      // We have unpushed local changes
      if (remote && remoteTime > (meta.lastSyncedAt || 0)) {
        // Both changed since last sync → merge so nothing is lost
        const merged = mergeData(local, remote.data || {});
        applyToLocal(merged);
        updatedAt = await pushRemote(userId, merged);
      } else {
        updatedAt = await pushRemote(userId, local);
      }
    } else if (remote && remoteTime > (meta.lastSyncedAt || 0)) {
      // Another device changed things → take the cloud copy
      applyToLocal(remote.data || {});
      updatedAt = remote.updated_at;
    } else if (!remote) {
      updatedAt = await pushRemote(userId, local);
    } else {
      updatedAt = remote.updated_at;
    }

    const lastSyncedAt = Date.parse(updatedAt) || Date.now();
    writeMeta({ userId, dirty: false, lastSyncedAt });
    setState({ status: 'synced', lastSyncedAt });
  } catch (err) {
    console.error('Flixstar sync failed:', err);
    setState({ status: 'error', error: err?.message || 'Sync failed' });
  } finally {
    busy = false;
  }
}

/* ---------- auth ---------- */

/* ---------- cross-browser sign-in handoff ----------
   1. This device asks for a link and remembers a random handoff id (h).
   2. The link opens /auth/callback?h=…&code=… in whatever browser.
   3. If that browser is this one, it signs in directly. Otherwise it
      drops the code into login_handoffs under h.
   4. This device polls for h, takes the code and redeems it with its own
      PKCE verifier — so it gets its own independent session.            */

const PENDING_KEY = 'fxs-login-pending'; // not "flixstar-" → never synced
const PENDING_MAX_MS = 15 * 60 * 1000;
const VERIFIER_KEY = 'sb-flixstar-auth-code-verifier';

function readPending() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    if (p && Date.now() - p.at < PENDING_MAX_MS) return p;
  } catch {}
  return null;
}

function clearPending() {
  rawRemove(PENDING_KEY);
  setState({ pendingLogin: null });
}

export function getPendingLogin() {
  return readPending();
}

export function cancelPendingLogin() {
  clearPending();
}

const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });

export async function sendLoginCode(email) {
  if (!supabase) throw new Error('Sync is not configured');
  const h = newId();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${location.origin}/auth/callback?h=${h}`
    }
  });
  if (error) throw error;
  const pending = { h, email, at: Date.now() };
  rawSet(PENDING_KEY, JSON.stringify(pending));
  setState({ pendingLogin: pending });
  startHandoffPolling();
}

async function redeem(code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  clearPending();
}

let pollTimer = null;
let polling = false;

async function pollHandoffOnce() {
  const pending = readPending();
  if (!pending || state.user) {
    stopHandoffPolling();
    if (!pending) setState({ pendingLogin: null });
    return;
  }
  if (polling) return;
  polling = true;
  try {
    const { data, error } = await supabase.rpc('take_login_handoff', { h: pending.h });
    if (error) {
      // Network/setup problem — keep waiting and try again next tick.
      console.warn('Sign-in handoff check failed:', error.message || error);
      return;
    }
    if (data) {
      try {
        await redeem(data);
      } catch (err) {
        // The code arrived but couldn't be redeemed here (e.g. expired, or
        // a newer link was requested since). Stop waiting and say so.
        console.warn('Sign-in code redemption failed:', err?.message || err);
        setState({ loginError: 'That link could not be used on this device. Please request a new one.' });
        clearPending();
      }
    }
  } finally {
    polling = false;
  }
}

function startHandoffPolling() {
  if (pollTimer || !supabase) return;
  pollTimer = setInterval(pollHandoffOnce, 2500);
  pollHandoffOnce();
}

function stopHandoffPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

/* Runs on /auth/callback in whichever browser opened the email link.
   Returns 'signed-in' | 'handed-off' | throws. */
export async function handleAuthCallback() {
  if (!supabase) throw new Error('Sync is not configured');

  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const errCode = query.get('error_code') || hash.get('error_code') || query.get('error') || hash.get('error');
  if (errCode) {
    const e = new Error(query.get('error_description') || hash.get('error_description') || errCode);
    e.code = errCode;
    throw e;
  }

  const code = query.get('code');
  const h = query.get('h');
  if (!code) throw new Error('This sign-in link is incomplete. Please request a new one.');

  // Same browser that asked → sign in right here.
  const pending = readPending();
  if (localStorage.getItem(VERIFIER_KEY) && (!h || pending?.h === h)) {
    try {
      await redeem(code);
      return 'signed-in';
    } catch (err) {
      if (!h) throw err;
      // fall through to handoff
    }
  }

  if (!h) throw new Error('Open this link on the device where you asked to sign in.');

  const { error } = await supabase.rpc('put_login_handoff', { h, c: code });
  if (error) throw error;
  return 'handed-off';
}

export async function verifyLoginCode(email, token) {
  if (!supabase) throw new Error('Sync is not configured');
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'email'
  });
  if (error) throw error;
}

export async function signOut({ clearLocal = false } = {}) {
  if (!supabase) return;
  await supabase.auth.signOut();
  writeMeta({ userId: null, dirty: false, lastSyncedAt: null });
  if (clearLocal) applyToLocal({});
  setState({ user: null, status: 'idle', lastSyncedAt: null });
}

/* ---------- boot ---------- */

let started = false;

export function startSync() {
  if (started || !supabase) return;
  started = true;

  // Push whenever the app writes any flixstar-* key
  // (Patch the prototype: assigning localStorage.setItem directly would be
  //  stored as an item called "setItem" in some browsers.)
  const protoSet = Storage.prototype.setItem;
  const protoRemove = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    protoSet.call(this, key, value);
    if (this === localStorage && isSyncedKey(key)) markDirty();
  };
  Storage.prototype.removeItem = function (key) {
    protoRemove.call(this, key);
    if (this === localStorage && isSyncedKey(key)) markDirty();
  };

  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user || null;
    setState({ user });
    if (user) syncNow();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    const changed = user?.id !== state.user?.id;
    if (user) {
      stopHandoffPolling();
      if (readPending()) clearPending();
    }
    setState({ user, loginError: user ? '' : state.loginError });
    if (user && changed) syncNow();
  });

  // Resume waiting for a sign-in started earlier (e.g. app was closed
  // while you went to your email).
  if (readPending()) {
    setState({ pendingLogin: readPending() });
    startHandoffPolling();
  }

  const pull = () => {
    if (document.visibilityState !== 'visible') return;
    if (readPending() && !state.user) {
      startHandoffPolling();
      pollHandoffOnce();
    }
    syncNow();
  };
  document.addEventListener('visibilitychange', pull);
  window.addEventListener('focus', pull);
  setInterval(pull, 60000);

  // Flush pending changes when leaving the page
  window.addEventListener('pagehide', () => {
    if (readMeta().dirty) syncNow();
  });
}

/* ---------- user settings (synced) ---------- */

export const DEFAULT_SETTINGS = {
  resumePlayback: true,
  preferredServer: '',
  trackProgress: true
};

export function readSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(localStorage.getItem('flixstar-settings') || '{}') || {})
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  localStorage.setItem('flixstar-settings', JSON.stringify(next));
  window.dispatchEvent(new Event('flixstar-settings'));
  return next;
}
