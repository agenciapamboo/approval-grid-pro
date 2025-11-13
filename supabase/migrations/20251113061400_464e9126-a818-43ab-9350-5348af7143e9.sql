-- =====================================================
-- ETAPA 2: Corrigir políticas de CLIENT_NOTES, CLIENT_SOCIAL_ACCOUNTS e COMMENTS
-- =====================================================

-- CLIENT_NOTES: Remover recursão
DROP POLICY IF EXISTS "Agency admins can view their client notes" ON client_notes;

CREATE POLICY "Agency admins can view their client notes"
ON client_notes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_notes.client_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
);

-- CLIENT_SOCIAL_ACCOUNTS: Remover recursão
DROP POLICY IF EXISTS "Agency admins can manage their clients social accounts" ON client_social_accounts;
DROP POLICY IF EXISTS "Clients can view their social accounts" ON client_social_accounts;

CREATE POLICY "Agency admins can manage their clients social accounts"
ON client_social_accounts
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = public.get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Clients can view their social accounts"
ON client_social_accounts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_user')
  AND client_id = public.get_user_client_id(auth.uid())
);

-- COMMENTS: Remover recursão
DROP POLICY IF EXISTS "Agency admins can delete comments on their clients' contents" ON comments;
DROP POLICY IF EXISTS "Approvers can view client comments" ON comments;
DROP POLICY IF EXISTS "Users can view comments on accessible contents" ON comments;

CREATE POLICY "Agency admins can delete comments on their clients' contents"
ON comments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND EXISTS (
    SELECT 1 FROM contents c
    JOIN clients cl ON cl.id = c.client_id
    WHERE c.id = comments.content_id
      AND cl.agency_id = public.get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Approvers can view client comments"
ON comments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'approver')
  AND EXISTS (
    SELECT 1 FROM contents c
    JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = comments.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

CREATE POLICY "Users can view comments on accessible contents"
ON comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = comments.content_id
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