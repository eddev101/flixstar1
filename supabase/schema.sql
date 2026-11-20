-- Flixstar cloud sync table. Run once in Supabase → SQL Editor.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "own row select" on public.user_data;
drop policy if exists "own row insert" on public.user_data;
drop policy if exists "own row update" on public.user_data;
drop policy if exists "own row delete" on public.user_data;

create policy "own row select" on public.user_data for select using (auth.uid() = user_id);
create policy "own row insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own row update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.user_data for delete using (auth.uid() = user_id);

-- =====================================================================
-- ADMIN DASHBOARD  (safe to re-run)
-- After running, make yourself an admin (use the email you sign in with):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL_HERE'
--   on conflict do nothing;
-- =====================================================================

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies on admins: nobody can read/write it from the browser.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;

-- Admins can read every user's synced data (for stats)
drop policy if exists "admin read all" on public.user_data;
create policy "admin read all" on public.user_data
  for select using (public.is_admin());

-- User list for the dashboard (emails live in auth.users, which the
-- browser can't read directly)
create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- Site-wide settings (e.g. the announcement banner). Everyone can read,
-- only admins can write.
create table if not exists public.site_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;

drop policy if exists "public read config" on public.site_config;
drop policy if exists "admin write config" on public.site_config;

create policy "public read config" on public.site_config
  for select using (true);
create policy "admin write config" on public.site_config
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- CROSS-BROWSER SIGN-IN HANDOFF  (safe to re-run)
-- Lets you tap the email link in ANY browser/device and have the
-- device/app that asked to sign in log itself in.
-- The link carries a one-time PKCE auth code. It's useless without the
-- secret "code verifier" that only the requesting device holds, so
-- passing it through this table is safe. Rows expire after 15 minutes.
-- =====================================================================

create table if not exists public.login_handoffs (
  id         uuid primary key,
  code       text not null,
  created_at timestamptz not null default now()
);
alter table public.login_handoffs enable row level security;
-- No policies: only the two functions below can touch this table.

create or replace function public.put_login_handoff(h uuid, c text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.login_handoffs where created_at < now() - interval '15 minutes';
  if length(c) > 200 then raise exception 'invalid code'; end if;
  insert into public.login_handoffs (id, code) values (h, c)
  on conflict (id) do update set code = excluded.code, created_at = now();
end;
$$;

create or replace function public.take_login_handoff(h uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result text;
begin
  delete from public.login_handoffs
  where id = h and created_at > now() - interval '15 minutes'
  returning code into result;
  return result;
end;
$$;

grant execute on function public.put_login_handoff(uuid, text) to anon, authenticated;
grant execute on function public.take_login_handoff(uuid) to anon, authenticated;
