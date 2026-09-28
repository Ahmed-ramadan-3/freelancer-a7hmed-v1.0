-- ============================================================================
-- SITE_NAME - Database schema and Row Level Security policies
-- ============================================================================
-- Run this once in the Supabase SQL Editor for a new project (or via the
-- Supabase CLI: `supabase db push`). It is safe to re-run on a fresh
-- database; it is NOT idempotent against a database that already has these
-- objects (drop them first, or use a migration tool, if you need to re-run
-- it on an existing project).
--
-- Design principle behind every policy below (master spec, section 27):
-- the frontend NEVER decides who is allowed to do what. It only reflects
-- what these policies already enforce. Even a fully compromised or
-- rewritten client cannot bypass them, because Postgres evaluates RLS on
-- every query regardless of which client sent it.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles: one row per auth.users row, carrying the app-specific role.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'manager', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

-- Every new Supabase Auth user automatically gets a profile row with the
-- lowest-privilege role. There is deliberately NO way for a client to grant
-- itself 'owner' or 'admin' - see README.md "Creating the first owner" for
-- the one-time manual step of promoting yourself directly in the table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- categories: mirrors src/config/categories.ts. Keeping both in sync is a
-- manual step for now (see README "Next Recommended Development" for
-- making the frontend read categories from this table instead).
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  slug text primary key,
  label_ar text not null,
  label_en text not null,
  icon text not null,
  sort_order int not null default 0
);

-- Kept in sync with src/config/categories.ts, which is the taxonomy the
-- active static catalog (src/data/resources.ts) also uses, so a future
-- reactivated Admin panel and the public site agree on category names.
insert into public.categories (slug, label_ar, label_en, icon, sort_order) values
  ('programs',       'برامج',            'Programs',      'app-window',     1),
  ('windows-tools',  'أدوات ويندوز',      'Windows Tools', 'wrench',         2),
  ('programming',    'برمجة',            'Programming',   'code',           3),
  ('books',          'كتب',              'Books',         'book-open',      4),
  ('pdfs',           'ملفات PDF',        'PDFs',          'file-text',      5),
  ('videos',         'فيديوهات',         'Videos',        'video',          6),
  ('courses',        'دورات',            'Courses',       'graduation-cap', 7),
  ('utilities',      'أدوات مساعدة',      'Utilities',     'wrench',         8),
  ('other',          'أخرى',             'Other',         'shapes',         9)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- files: the core resource table. storage_path points into the private
-- 'resources' Storage bucket (see storage_policies.sql) - it is never a
-- public URL by itself.
-- ----------------------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  category_slug text not null references public.categories (slug),
  resource_type text not null default 'other'
    check (resource_type in ('archive','video','pdf','book','software','document','image','other')),
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes >= 0),
  version text,
  is_public boolean not null default true,
  is_downloadable boolean not null default true,
  thumbnail_url text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_category_slug_idx on public.files (category_slug);
create index if not exists files_created_at_idx on public.files (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- admin_invitations: records intent to invite a new admin. Actually sending
-- the invitation email requires a privileged (service-role) call, which
-- belongs in a Supabase Edge Function that watches/processes this table -
-- see README.md "Next Recommended Development". This table only stores the
-- request; it never grants access by itself.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('owner','admin','manager','editor','viewer')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helper functions used by policies below. SECURITY DEFINER + a fixed
-- search_path lets a policy safely check the caller's role by reading
-- `profiles` without that read itself being blocked by profiles' own RLS
-- (which would otherwise cause infinite recursion).
-- ----------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() in ('owner', 'admin');
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_role() = 'owner';
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS. Postgres denies ALL access by default once enabled; only the
-- policies below carve out exceptions.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.files enable row level security;
alter table public.admin_invitations enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

-- categories -------------------------------------------------------------------
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select using (true); -- categories are not sensitive; anyone can browse them

drop policy if exists categories_write_staff on public.categories;
create policy categories_write_staff on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

-- files ------------------------------------------------------------------------
drop policy if exists files_select on public.files;
create policy files_select on public.files
  for select using (is_public = true or created_by = auth.uid() or public.is_staff());

drop policy if exists files_insert_staff on public.files;
create policy files_insert_staff on public.files
  for insert with check (public.is_staff() and created_by = auth.uid());

drop policy if exists files_update_staff on public.files;
create policy files_update_staff on public.files
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists files_delete_staff on public.files;
create policy files_delete_staff on public.files
  for delete using (public.is_staff());

-- admin_invitations --------------------------------------------------------------
drop policy if exists invitations_owner_only on public.admin_invitations;
create policy invitations_owner_only on public.admin_invitations
  for all using (public.is_owner()) with check (public.is_owner());
