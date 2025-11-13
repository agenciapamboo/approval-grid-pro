-- CORREÇÃO CRÍTICA: Remover policies duplicadas que causam recursão infinita

-- 1. REMOVER TODAS AS POLICIES DA TABELA CLIENTS
DROP POLICY IF EXISTS "super_admin_full_access" ON clients;
DROP POLICY IF EXISTS "agency_admin_own_clients" ON clients;
DROP POLICY IF EXISTS "client_user_own_data" ON clients;
DROP POLICY IF EXISTS "team_member_agency_clients" ON clients;
DROP POLICY IF EXISTS "super_admin_all_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_clients" ON clients;
DROP POLICY IF EXISTS "client_user_own_client" ON clients;
DROP POLICY IF EXISTS "team_member_clients" ON clients;
DROP POLICY IF EXISTS "approver_select_assigned_clients" ON clients;
DROP POLICY IF EXISTS "super_admin_select_clients" ON clients;
DROP POLICY IF EXISTS "super_admin_insert_clients" ON clients;
DROP POLICY IF EXISTS "super_admin_update_clients" ON clients;
DROP POLICY IF EXISTS "super_admin_delete_clients" ON clients;

-- 2. RECRIAR POLICIES SIMPLES SEM RECURSÃO

-- Super Admin - acesso total
CREATE POLICY "super_admin_all_clients" ON clients
  FOR ALL 
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Agency Admin - apenas clientes da própria agência
CREATE POLICY "agency_admin_own_clients" ON clients
  FOR ALL 
  TO authenticated
  USING (
    has_role(auth.uid(), 'agency_admin') 
    AND agency_id = get_user_agency_id(auth.uid())
  );

-- Team Member - apenas visualizar clientes da agência
CREATE POLICY "team_member_view_clients" ON clients
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'team_member')
    AND agency_id = get_user_agency_id(auth.uid())
  );

-- Client User - apenas visualizar próprio cliente
CREATE POLICY "client_user_own_client" ON clients
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_user') 
    AND id = get_user_client_id(auth.uid())
  );

-- Approver - visualizar clientes vinculados
CREATE POLICY "approver_assigned_clients" ON clients
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'approver')
    AND id IN (
      SELECT client_id 
      FROM client_approvers 
      WHERE user_id = auth.uid() 
        AND is_active = true
    )
  );