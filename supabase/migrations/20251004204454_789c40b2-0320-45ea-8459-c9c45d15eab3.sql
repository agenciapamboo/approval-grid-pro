-- Adicionar política para permitir que agency_admin delete conteúdos
CREATE POLICY "Agency admins can delete contents"
ON public.contents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid()
      AND p.role = 'agency_admin'
      AND c.id = contents.client_id
  )
);

-- Adicionar política para permitir que agency_admin delete media de conteúdos
CREATE POLICY "Agency admins can delete content media"
ON public.content_media
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM contents co
    JOIN clients c ON c.id = co.client_id
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE co.id = content_media.content_id
      AND p.id = auth.uid()
      AND p.role = 'agency_admin'
  )
);

-- Adicionar política para permitir que agency_admin atualize media de conteúdos
CREATE POLICY "Agency admins can update content media"
ON public.content_media
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM contents co
    JOIN clients c ON c.id = co.client_id
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE co.id = content_media.content_id
      AND p.id = auth.uid()
      AND p.role = 'agency_admin'
  )
);