/* Admin + site config data helpers (Supabase) */
import { supabase } from './sync.js';

export async function checkIsAdmin() {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

export async function loadAdminData() {
  const [users, rows] = await Promise.all([
    supabase.rpc('admin_users'),
    supabase.from('user_data').select('user_id, data, updated_at')
  ]);
  if (users.error) throw users.error;
  if (rows.error) throw rows.error;
  return { users: users.data || [], rows: rows.data || [] };
}

export async function getSiteConfig(key) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('site_config')
    .select('value, updated_at')
    .eq('key', key)
    .maybeSingle();
  if (error) return null;
  return data ? { ...data.value, updatedAt: data.updated_at } : null;
}

export async function setSiteConfig(key, value) {
  const { error } = await supabase
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

const parse = v => {
  try { return JSON.parse(v); } catch { return null; }
};

/* Turn every user's synced blob into dashboard stats */
export function computeStats(users, rows) {
  const now = Date.now();
  const DAY = 86400000;
  const byUser = new Map(rows.map(r => [r.user_id, r]));

  const saved = new Map();      // key -> {item, count}
  const watching = new Map();   // key -> {item, count}
  let totalSaved = 0;
  let totalInProgress = 0;

  const perUser = users.map(u => {
    const row = byUser.get(u.id);
    const data = row?.data || {};
    const lists = parse(data['flixstar-lists']) || [];
    const progress = parse(data['flixstar-watch-progress']) || [];

    let savedCount = 0;
    (Array.isArray(lists) ? lists : []).forEach(list => {
      (list?.items || []).forEach(item => {
        savedCount++;
        const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const k = `${type}-${item.id}`;
        const prev = saved.get(k) || { item: { ...item, media_type: type }, count: 0 };
        prev.count++;
        saved.set(k, prev);
      });
    });

    const seen = new Set();
    (Array.isArray(progress) ? progress : []).forEach(p => {
      const k = `${p.type}-${p.id}`;
      if (seen.has(k)) return;   // count a show once per user
      seen.add(k);
      const prev = watching.get(k) || { item: { ...p, media_type: p.type }, count: 0 };
      prev.count++;
      watching.set(k, prev);
    });

    totalSaved += savedCount;
    totalInProgress += seen.size;

    const lastActive = Math.max(
      row?.updated_at ? Date.parse(row.updated_at) : 0,
      u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0
    );

    return {
      ...u,
      savedCount,
      inProgress: seen.size,
      listCount: Array.isArray(lists) ? lists.length : 0,
      lastActive: lastActive || null
    };
  });

  const top = m => [...m.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  return {
    totals: {
      users: users.length,
      active7: perUser.filter(u => u.lastActive && now - u.lastActive < 7 * DAY).length,
      new7: users.filter(u => now - Date.parse(u.created_at) < 7 * DAY).length,
      saved: totalSaved,
      inProgress: totalInProgress
    },
    perUser,
    topSaved: top(saved),
    topWatching: top(watching)
  };
}
