-- ============================================================================
-- Studio Learn - Catalog resource metadata table (Neon Postgres)
-- ============================================================================
-- Run this once against your Neon database - e.g. via the Neon SQL Editor
-- (console.neon.tech -> your project -> SQL Editor), or `psql "$DATABASE_URL"
-- -f db/resources_schema.sql` from your own machine. This replaces the
-- earlier Supabase-hosted version of this same table (previously
-- supabase/resources_schema.sql, now removed - this file supersedes it, it
-- doesn't coexist with it). It is independent of supabase/schema.sql and
-- supabase/storage_policies.sql, which remain untouched: those belong to the
-- older, preserved-but-disabled legacy Admin/FileResource panel and are a
-- completely separate table in a separate project.
--
-- What this table is for ("DO NOT implement file/object storage"): metadata
-- ONLY, so the public catalog can stay in sync across every visitor and
-- device. It never stores a file's bytes - only a title, a description, and
-- the exact external Google Drive/OneDrive URL the owner already controls.
-- See api/_lib/resourcesDb.ts and api/resources/*.ts for the only code that
-- reads/writes this table, and src/lib/resourceBackend.ts for the one public,
-- read-only route (GET /api/resources) that exposes it to the browser.
--
-- Security model: unlike the project's earlier Supabase-backed version of
-- this table, there is no public "anon key" direct-to-database path at all
-- here - Neon has no built-in PostgREST/RLS layer, and none is needed: every
-- single access to this table, reads included, goes through this project's
-- own server-side Vercel Edge Functions, which hold the only credential
-- that can reach it (`DATABASE_URL`, server-only, never sent to a browser).
-- Writes are further gated by the admin session cookie (api/_lib/
-- adminAuth.ts) - a signed-out request gets a 401 before a single query runs.
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

-- No Row Level Security here - see the "Security model" note above. Access
-- control for this table lives entirely in api/_lib/adminAuth.ts and the
-- fact that DATABASE_URL is a server-only secret, not in a database policy.
