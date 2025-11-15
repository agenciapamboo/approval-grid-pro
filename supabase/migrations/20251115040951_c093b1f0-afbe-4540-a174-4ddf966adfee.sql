-- Parte 1: RLS Policies para content_media
CREATE POLICY "Users can view media of accessible contents"
ON content_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM contents c
    JOIN profiles p ON (
      p.client_id = c.client_id 
      OR EXISTS (
        SELECT 1 FROM clients cl 
        WHERE cl.id = c.client_id 
        AND cl.agency_id = p.agency_id
      )
    )
    WHERE c.id = content_media.content_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Approvers can view media of their client contents"
ON content_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM contents c
    JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_media.content_id
    AND ca.user_id = auth.uid()
    AND ca.is_active = true
  )
);

-- Parte 2: RLS Policies para content_texts
CREATE POLICY "Users can view texts of accessible contents"
ON content_texts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM contents c
    JOIN profiles p ON (
      p.client_id = c.client_id 
      OR EXISTS (
        SELECT 1 FROM clients cl 
        WHERE cl.id = c.client_id 
        AND cl.agency_id = p.agency_id
      )
    )
    WHERE c.id = content_texts.content_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Approvers can view texts of their client contents"
ON content_texts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM contents c
    JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_texts.content_id
    AND ca.user_id = auth.uid()
    AND ca.is_active = true
  )
);

-- Parte 3: Storage policy para content-media bucket
CREATE POLICY "Authenticated users can read content media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'content-media');