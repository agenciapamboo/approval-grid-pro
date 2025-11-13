-- ========================================
-- FASE D: Políticas INSERT/UPDATE/DELETE
-- ========================================

-- AGENCIES: INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "agencies_insert_super" ON public.agencies;
DROP POLICY IF EXISTS "agencies_update_super" ON public.agencies;
DROP POLICY IF EXISTS "agencies_update_own" ON public.agencies;
DROP POLICY IF EXISTS "agencies_delete_super" ON public.agencies;

CREATE POLICY "agencies_insert_super"
  ON public.agencies FOR INSERT
  WITH CHECK ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "agencies_update_super"
  ON public.agencies FOR UPDATE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "agencies_update_own"
  ON public.agencies FOR UPDATE
  USING ( 
    has_role(auth.uid(), 'agency_admin')
    AND id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "agencies_delete_super"
  ON public.agencies FOR DELETE
  USING ( has_role(auth.uid(), 'super_admin') );

-- CLIENTS: INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "clients_insert_super" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_admin" ON public.clients;
DROP POLICY IF EXISTS "clients_update_super" ON public.clients;
DROP POLICY IF EXISTS "clients_update_admin" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_super" ON public.clients;

CREATE POLICY "clients_insert_super"
  ON public.clients FOR INSERT
  WITH CHECK ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "clients_insert_admin"
  ON public.clients FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agency_admin')
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "clients_update_super"
  ON public.clients FOR UPDATE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "clients_update_admin"
  ON public.clients FOR UPDATE
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "clients_delete_super"
  ON public.clients FOR DELETE
  USING ( has_role(auth.uid(), 'super_admin') );

-- CONTENTS: INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "contents_insert_super" ON public.contents;
DROP POLICY IF EXISTS "contents_insert_admin" ON public.contents;
DROP POLICY IF EXISTS "contents_insert_team" ON public.contents;
DROP POLICY IF EXISTS "contents_update_super" ON public.contents;
DROP POLICY IF EXISTS "contents_update_admin" ON public.contents;
DROP POLICY IF EXISTS "contents_update_team" ON public.contents;
DROP POLICY IF EXISTS "contents_update_approver" ON public.contents;
DROP POLICY IF EXISTS "contents_delete_super" ON public.contents;
DROP POLICY IF EXISTS "contents_delete_admin" ON public.contents;

CREATE POLICY "contents_insert_super"
  ON public.contents FOR INSERT
  WITH CHECK ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "contents_insert_admin"
  ON public.contents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "contents_insert_team"
  ON public.contents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'team_member')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "contents_update_super"
  ON public.contents FOR UPDATE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "contents_update_admin"
  ON public.contents FOR UPDATE
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "contents_update_team"
  ON public.contents FOR UPDATE
  USING (
    has_role(auth.uid(), 'team_member')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

-- Approvers podem atualizar status (aprovação via edge function, não diretamente)
CREATE POLICY "contents_update_approver"
  ON public.contents FOR UPDATE
  USING (
    has_role(auth.uid(), 'approver')
    AND client_id = get_user_client_id(auth.uid())
    AND status IN ('draft', 'in_review')
  );

CREATE POLICY "contents_delete_super"
  ON public.contents FOR DELETE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "contents_delete_admin"
  ON public.contents FOR DELETE
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

-- CLIENT_APPROVERS: INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "approvers_insert_super" ON public.client_approvers;
DROP POLICY IF EXISTS "approvers_insert_admin" ON public.client_approvers;
DROP POLICY IF EXISTS "approvers_update_super" ON public.client_approvers;
DROP POLICY IF EXISTS "approvers_update_admin" ON public.client_approvers;
DROP POLICY IF EXISTS "approvers_delete_super" ON public.client_approvers;
DROP POLICY IF EXISTS "approvers_delete_admin" ON public.client_approvers;

CREATE POLICY "approvers_insert_super"
  ON public.client_approvers FOR INSERT
  WITH CHECK ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "approvers_insert_admin"
  ON public.client_approvers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "approvers_update_super"
  ON public.client_approvers FOR UPDATE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "approvers_update_admin"
  ON public.client_approvers FOR UPDATE
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "approvers_delete_super"
  ON public.client_approvers FOR DELETE
  USING ( has_role(auth.uid(), 'super_admin') );

CREATE POLICY "approvers_delete_admin"
  ON public.client_approvers FOR DELETE
  USING (
    has_role(auth.uid(), 'agency_admin')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );