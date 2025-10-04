-- Criar buckets de storage para mídia de conteúdo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('content-media', 'content-media', true, 52428800, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo'])
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas para upload de mídia (agency_admin e client_user podem fazer upload)
CREATE POLICY "Users can upload media for their contents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-media' AND
  (
    -- Agency admin pode fazer upload
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency_admin', 'super_admin')
    )
    OR
    -- Client user pode fazer upload
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'client_user'
    )
  )
);

-- Políticas para visualizar mídia
CREATE POLICY "Users can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'content-media');

-- Políticas para deletar mídia (apenas quem criou ou admins)
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-media' AND
  (
    (owner)::uuid = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency_admin', 'super_admin')
    )
  )
);