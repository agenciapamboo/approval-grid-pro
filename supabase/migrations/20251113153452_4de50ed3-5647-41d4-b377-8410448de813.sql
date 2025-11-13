-- Reafirmar SELECTs nas tabelas de negócio
-- Não mexe em mutações agora

-- agencies
DROP POLICY IF EXISTS agencies_select_super ON public.agencies;
DROP POLICY IF EXISTS agencies_select_own ON public.agencies;

CREATE POLICY agencies_select_super
  ON public.agencies FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY agencies_select_own
  ON public.agencies FOR SELECT
  USING (id = get_user_agency_id(auth.uid()));

-- clients
DROP POLICY IF EXISTS clients_select_super ON public.clients;
DROP POLICY IF EXISTS clients_select_admin ON public.clients;
DROP POLICY IF EXISTS clients_select_self ON public.clients;

CREATE POLICY clients_select_super
  ON public.clients FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY clients_select_admin
  ON public.clients FOR SELECT
  USING (
    has_role(auth.uid(), 'agency_admin'::app_role)
    AND agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY clients_select_self
  ON public.clients FOR SELECT
  USING (
    (has_role(auth.uid(), 'client_user'::app_role) OR has_role(auth.uid(), 'approver'::app_role))
    AND id = get_user_client_id(auth.uid())
  );

-- contents
DROP POLICY IF EXISTS contents_select_super ON public.contents;
DROP POLICY IF EXISTS contents_select_admin ON public.contents;
DROP POLICY IF EXISTS contents_select_self ON public.contents;

CREATE POLICY contents_select_super
  ON public.contents FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY contents_select_admin
  ON public.contents FOR SELECT
  USING (
    has_role(auth.uid(), 'agency_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = contents.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY contents_select_self
  ON public.contents FOR SELECT
  USING (
    (has_role(auth.uid(), 'client_user'::app_role) OR has_role(auth.uid(), 'approver'::app_role))
    AND client_id = get_user_client_id(auth.uid())
  );