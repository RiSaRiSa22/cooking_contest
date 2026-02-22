-- ============================================================
-- Migration 02: Storage anon upload policy
-- Allows anon SDK clients to upload photos directly to dish-photos bucket
-- ============================================================

CREATE POLICY "anon_upload_dish_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-photos');
