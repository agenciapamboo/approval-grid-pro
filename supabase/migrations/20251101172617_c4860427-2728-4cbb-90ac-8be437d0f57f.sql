-- Fix RLS for views - views with security_invoker inherit base table policies
-- We need to ensure the base tables (agencies, clients, client_social_accounts) have proper RLS
-- The views already have security_invoker = on, so they will use the caller's privileges

-- Make content-media storage bucket private and add RLS policies
UPDATE storage.buckets
SET public = false
WHERE id = 'content-media';

-- Drop existing overly permissive storage policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view content-media" ON storage.objects;

-- Storage policies for content-media bucket
-- Agency admins can upload content media
CREATE POLICY "Agency admins can upload content media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'content-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin')
  )
);

-- Agency admins can view content media for their agency's clients
CREATE POLICY "Agency admins can view their clients content media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'content-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin')
  )
);

-- Agency admins can update content media
CREATE POLICY "Agency admins can update content media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'content-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin')
  )
);

-- Agency admins can delete content media
CREATE POLICY "Agency admins can delete content media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'content-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin')
  )
);

-- Client users can view media for their own contents
CREATE POLICY "Client users can view their content media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'content-media'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND has_role(auth.uid(), 'client_user')
  )
);