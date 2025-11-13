-- =====================================================
-- SIMPLIFICAÇÃO RADICAL: Remover TODAS políticas RLS recursivas
-- e criar políticas SIMPLES baseadas apenas em roles
-- =====================================================

-- ============= TABELA: clients =============
DROP POLICY IF EXISTS "agency_admin_delete_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_insert_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_select_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_update_clients" ON clients;
DROP POLICY IF EXISTS "team_member_select_clients" ON clients;
DROP POLICY IF EXISTS "client_user_select_own_client" ON clients;
DROP POLICY IF EXISTS "super_admin_manage_all_clients" ON clients;

-- Super Admin: acesso total
CREATE POLICY "super_admin_all_clients"
ON clients FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency Admin: apenas sua agência
CREATE POLICY "agency_admin_clients"
ON clients FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- Team Member: leitura da agência
CREATE POLICY "team_member_clients"
ON clients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_member')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- Client User: apenas seu cliente
CREATE POLICY "client_user_own_client"
ON clients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_user')
  AND id = public.get_user_client_id(auth.uid())
);

-- ============= TABELA: profiles =============
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Agency admins can view agency profiles" ON profiles;
DROP POLICY IF EXISTS "Team members can view team profiles" ON profiles;

-- Super Admin: acesso total
CREATE POLICY "super_admin_all_profiles"
ON profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency Admin: sua agência
CREATE POLICY "agency_admin_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- Todos: ver próprio perfil
CREATE POLICY "own_profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Todos: atualizar próprio perfil (campos limitados)
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============= TABELA: agencies =============
DROP POLICY IF EXISTS "super_admin_manage_all_agencies" ON agencies;
DROP POLICY IF EXISTS "agency_admin_view_own_agency" ON agencies;
DROP POLICY IF EXISTS "agency_admin_update_own_agency" ON agencies;

-- Super Admin: acesso total
CREATE POLICY "super_admin_all_agencies"
ON agencies FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency Admin: apenas visualizar sua agência
CREATE POLICY "agency_admin_own_agency"
ON agencies FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND id = public.get_user_agency_id(auth.uid())
);

-- ============= TABELA: contents =============
DROP POLICY IF EXISTS "agency_admin_select_contents" ON contents;
DROP POLICY IF EXISTS "agency_staff_delete_contents" ON contents;
DROP POLICY IF EXISTS "agency_staff_insert_contents" ON contents;
DROP POLICY IF EXISTS "agency_staff_update_contents" ON contents;
DROP POLICY IF EXISTS "approver_select_contents" ON contents;
DROP POLICY IF EXISTS "approver_update_contents" ON contents;
DROP POLICY IF EXISTS "client_user_select_contents" ON contents;
DROP POLICY IF EXISTS "super_admin_select_contents" ON contents;
DROP POLICY IF EXISTS "team_member_select_contents" ON contents;

-- Super Admin: acesso total
CREATE POLICY "super_admin_all_contents"
ON contents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency Admin & Team Member: conteúdos da agência
CREATE POLICY "agency_contents"
ON contents FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'team_member'))
  AND public.user_belongs_to_agency(auth.uid(), (SELECT agency_id FROM clients WHERE id = client_id))
)
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'team_member'))
  AND public.user_belongs_to_agency(auth.uid(), (SELECT agency_id FROM clients WHERE id = client_id))
);

-- Client User: conteúdos do próprio cliente
CREATE POLICY "client_user_contents"
ON contents FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_user')
  AND client_id = public.get_user_client_id(auth.uid())
);

-- Approver: conteúdos dos clientes que aprova
CREATE POLICY "approver_contents"
ON contents FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'approver')
  AND EXISTS (
    SELECT 1 FROM client_approvers
    WHERE client_approvers.user_id = auth.uid()
    AND client_approvers.client_id = contents.client_id
    AND client_approvers.is_active = true
  )
);