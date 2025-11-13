-- Recriar políticas RLS essenciais que foram removidas pelo CASCADE
-- Seguindo o padrão SELECT-only para evitar recursão

-- AGENCIES
CREATE POLICY "Super admin can select all agencies"
  ON public.agencies FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can select their agency"
  ON public.agencies FOR SELECT
  USING (public.has_role(auth.uid(), 'agency_admin') AND id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Team members can select their agency"
  ON public.agencies FOR SELECT
  USING (public.has_role(auth.uid(), 'team_member') AND id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Agency admins can update their agency"
  ON public.agencies FOR UPDATE
  USING (public.has_role(auth.uid(), 'agency_admin') AND id = public.get_user_agency_id(auth.uid()));

-- CLIENTS
CREATE POLICY "Super admin can select all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can select their clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Team members can select their agency clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'team_member') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Client users can select their client"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'client_user') AND id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Approvers can select their client"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'approver') AND id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Agency admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Agency admins can update their clients"
  ON public.clients FOR UPDATE
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

-- CONTENTS
CREATE POLICY "Super admin can select all contents"
  ON public.contents FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can select their clients contents"
  ON public.contents FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agency_admin') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Team members can select their agency contents"
  ON public.contents FOR SELECT
  USING (
    public.has_role(auth.uid(), 'team_member') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Client users can select their contents"
  ON public.contents FOR SELECT
  USING (public.has_role(auth.uid(), 'client_user') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Approvers can select their client contents"
  ON public.contents FOR SELECT
  USING (public.has_role(auth.uid(), 'approver') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Agency admins can insert contents"
  ON public.contents FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'agency_admin') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Team members can insert contents"
  ON public.contents FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'team_member') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Agency admins can update contents"
  ON public.contents FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'agency_admin') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Team members can update contents"
  ON public.contents FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'team_member') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

CREATE POLICY "Agency admins can delete contents"
  ON public.contents FOR DELETE
  USING (
    public.has_role(auth.uid(), 'agency_admin') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = contents.client_id AND c.agency_id = public.get_user_agency_id(auth.uid()))
  );

-- CLIENT_APPROVERS
CREATE POLICY "Agency admins can select their clients approvers"
  ON public.client_approvers FOR SELECT
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Client users can select their approvers"
  ON public.client_approvers FOR SELECT
  USING (public.has_role(auth.uid(), 'client_user') AND client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Agency admins can insert approvers"
  ON public.client_approvers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Agency admins can update approvers"
  ON public.client_approvers FOR UPDATE
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Agency admins can delete approvers"
  ON public.client_approvers FOR DELETE
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

-- PROFILES
CREATE POLICY "Super admin can select all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Agency admins can select their agency profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'agency_admin') AND agency_id = public.get_user_agency_id(auth.uid()));

CREATE POLICY "Users can select their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());