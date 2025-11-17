-- Políticas RLS para UPDATE e DELETE em content_texts e content_media
-- Permite que usuários autenticados (agency_admin, team_member, client_user) editem/deletem
-- textos e mídias de conteúdos que eles têm acesso

-- ========================================
-- Políticas para content_texts
-- ========================================

-- Política UPDATE para content_texts
CREATE POLICY "Users can update content texts for accessible contents"
ON public.content_texts
FOR UPDATE
TO authenticated
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
)
WITH CHECK (
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

-- Política DELETE para content_texts
CREATE POLICY "Users can delete content texts for accessible contents"
ON public.content_texts
FOR DELETE
TO authenticated
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

-- ========================================
-- Políticas para content_media
-- ========================================

-- Política UPDATE para content_media
CREATE POLICY "Users can update media for accessible contents"
ON public.content_media
FOR UPDATE
TO authenticated
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
)
WITH CHECK (
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

-- Política DELETE para content_media
CREATE POLICY "Users can delete media for accessible contents"
ON public.content_media
FOR DELETE
TO authenticated
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