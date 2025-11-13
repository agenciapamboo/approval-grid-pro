-- =====================================================
-- ETAPA 3: Corrigir políticas de CONTENT_MEDIA, CONTENT_TEXTS e FEEDBACK
-- =====================================================

-- CONTENT_MEDIA: Remover recursão
DROP POLICY IF EXISTS "Agency admins can delete content media" ON content_media;
DROP POLICY IF EXISTS "Agency admins can update content media" ON content_media;
DROP POLICY IF EXISTS "Approvers can view client content media" ON content_media;
DROP POLICY IF EXISTS "Users can view media of accessible contents" ON content_media;

CREATE POLICY "Agency admins can delete content media"
ON content_media
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM contents co
    JOIN clients c ON c.id = co.client_id
    WHERE co.id = content_media.content_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Agency admins can update content media"
ON content_media
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM contents co
    JOIN clients c ON c.id = co.client_id
    WHERE co.id = content_media.content_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Approvers can view client content media"
ON content_media
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'approver')
  AND EXISTS (
    SELECT 1 FROM contents c
    JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_media.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

CREATE POLICY "Users can view media of accessible contents"
ON content_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_media.content_id
      AND (
        c.client_id = public.get_user_client_id(auth.uid())
        OR EXISTS (
          SELECT 1 FROM clients cl
          WHERE cl.id = c.client_id
            AND cl.agency_id = public.get_user_agency_id(auth.uid())
        )
      )
  )
);

-- CONTENT_TEXTS: Remover recursão
DROP POLICY IF EXISTS "Approvers can view client content texts" ON content_texts;
DROP POLICY IF EXISTS "Users can view content texts of accessible contents" ON content_texts;

CREATE POLICY "Approvers can view client content texts"
ON content_texts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'approver')
  AND EXISTS (
    SELECT 1 FROM contents c
    JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_texts.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

CREATE POLICY "Users can view content texts of accessible contents"
ON content_texts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_texts.content_id
      AND (
        c.client_id = public.get_user_client_id(auth.uid())
        OR EXISTS (
          SELECT 1 FROM clients cl
          WHERE cl.id = c.client_id
            AND cl.agency_id = public.get_user_agency_id(auth.uid())
        )
      )
  )
);

-- CONTENT_SUGGESTIONS_FEEDBACK: Remover recursão
DROP POLICY IF EXISTS "Agency admins can view their clients feedback" ON content_suggestions_feedback;

CREATE POLICY "Agency admins can view their clients feedback"
ON content_suggestions_feedback
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = content_suggestions_feedback.client_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
);