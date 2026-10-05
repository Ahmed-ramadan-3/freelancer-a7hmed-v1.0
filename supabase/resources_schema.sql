-- ============================================================================
-- Studio Learn - Catalog resource metadata table
-- ============================================================================
-- Run this once in the Supabase SQL Editor (or `supabase db push`), in
-- ADDITION to schema.sql (which is the OLDER, preserved-but-disabled
-- FileResource/Admin-upload schema - this file is independent of it and
-- does not touch it, modify it, or depend on it in any way).
--
-- What this table is for (master spec, "STORAGE - DO NOT ADD FILE STORAGE"):
-- metadata ONLY, so the public catalog can stay in sync across every
-- visitor and device. It never stores a file's bytes - only a title, a
-- description, and the exact external Google Drive/OneDrive URL the owner
-- already controls. See src/lib/resourceBackend.ts and api/resources/*.ts
-- for the only code that reads/writes this table.
--
-- Security model (master spec, section 15): the anon key (public, safe to
-- ship in the frontend bundle - see .env.example) can only ever SELECT from
-- this table. There is deliberately NO insert/update/delete policy for
-- "anon" or "authenticated" roles below - only the service_role key (used
-- exclusively inside the protected serverless functions under api/, never
-- sent to any browser) can write, because service_role bypasses RLS
-- entirely. A fully compromised or rewritten client still cannot write a
-- single row, regardless of what the frontend code does or doesn't check.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.resources (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null default 'other',
  resource_type text not null default 'other'
    check (resource_type in (
      'archive', 'software', 'tool', 'document', 'code',
      'pdf', 'image', 'video', 'course', 'other'
    )),
  file_type text not null default '',
  file_size text not null default '',
  platform text,
  icon text,
  image text,
  provider text not null
    check (provider in ('google-drive', 'one-drive')),
  external_url text not null,
  access_mode text not null default 'download-only'
    check (access_mode in ('download-only', 'preview-download', 'view-only')),
  preview_mode text not null default 'none'
    check (preview_mode in ('provider', 'video', 'image', 'pdf', 'none')),
  tags text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_category_idx on public.resources (category);
create index if not exists resources_created_at_idx on public.resources (created_at asc);

create or replace function public.resources_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.resources_set_updated_at();

alter table public.resources enable row level security;

-- Public read access - this IS the public catalog. Anyone (including a
-- signed-out visitor using only the anon key) can list resources.
drop policy if exists resources_public_read on public.resources;
create policy resources_public_read
  on public.resources
  for select
  using (true);

-- Deliberately no insert/update/delete policy of any kind. Writes only ever
-- happen through api/resources/*.ts using the service_role key, which
-- bypasses RLS by design - never through a client-held key.
