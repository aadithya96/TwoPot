-- 028_receipts_bucket.sql
-- Create the private `receipts` storage bucket used for expense receipt photos
-- and order screenshots (Blinkit/Swiggy, etc.), and restrict access to members
-- of the household whose id prefixes the object path. Uploads use the layout
-- `${household_id}/${uuid}.ext` (see useReceiptUpload.ts), so the first folder
-- segment is the owning household id.
--
-- Without this bucket, receipt/screenshot uploads fail with "Bucket not found".

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Reuse the same is_household_member() helper the table policies use, matching
-- on the first path segment (the household id) of each stored object.

create policy "receipts: household members read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts: household members insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts: household members update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "receipts: household members delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
