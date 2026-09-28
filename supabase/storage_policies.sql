-- ============================================================================
-- SITE_NAME - Storage bucket and object-level policies
-- ============================================================================
-- Run this AFTER supabase/schema.sql (it references public.files and the
-- is_staff()/is_owner() helper functions defined there).
--
-- The 'resources' bucket is PRIVATE. There is no public-bucket code path in
-- the frontend to keep in sync with these rules: every download - whether
-- the file is "public" or restricted - goes through a short-lived signed
-- URL (see src/services/supabase/supabaseFileService.ts, getDownloadUrl),
-- and Postgres decides whether that signed URL is allowed to be minted at
-- all, based on the matching row in public.files.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

-- Uploads are written to `${auth.uid()}/${random-uuid}-${filename}` by
-- supabaseFileService.uploadFile - the policy below enforces that a user can
-- only write into their OWN prefix, in addition to needing staff role.
-- (storage.foldername(name))[1] is the first path segment, i.e. the uid.)
drop policy if exists resources_insert_staff on storage.objects;
create policy resources_insert_staff on storage.objects
  for insert
  with check (
    bucket_id = 'resources'
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reading an object (including minting a signed URL for it) requires either
-- staff access, being the uploader, or the linked files row being public.
drop policy if exists resources_select on storage.objects;
create policy resources_select on storage.objects
  for select
  using (
    bucket_id = 'resources'
    and exists (
      select 1 from public.files f
      where f.storage_path = storage.objects.name
        and (f.is_public = true or f.created_by = auth.uid() or public.is_staff())
    )
  );

drop policy if exists resources_delete_staff on storage.objects;
create policy resources_delete_staff on storage.objects
  for delete
  using (bucket_id = 'resources' and public.is_staff());

-- ----------------------------------------------------------------------------
-- Manual step (Supabase Dashboard -> Storage -> resources -> Policies, or
-- re-running this file) is all that's needed; no code changes are required
-- on the frontend to pick this up, since it always calls createSignedUrl.
-- ----------------------------------------------------------------------------
