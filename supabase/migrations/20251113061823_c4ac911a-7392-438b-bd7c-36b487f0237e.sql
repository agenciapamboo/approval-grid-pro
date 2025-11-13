-- =====================================================
-- CORREÇÃO CRÍTICA: Remover recursão infinita da tabela CLIENTS
-- =====================================================

-- Remover todas as políticas recursivas
DROP POLICY IF EXISTS "agency_admin_delete_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_insert_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_select_clients" ON clients;
DROP POLICY IF EXISTS "agency_admin_update_clients" ON clients;
DROP POLICY IF EXISTS "team_member_select_clients" ON clients;
DROP POLICY IF EXISTS "client_user_select_own_client" ON clients;

-- Recriar políticas usando funções SECURITY DEFINER (SEM RECURSÃO)

-- Agency Admin: CRUD completo em clientes da sua agência
CREATE POLICY "agency_admin_select_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

CREATE POLICY "agency_admin_insert_clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

CREATE POLICY "agency_admin_update_clients"
ON clients
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

CREATE POLICY "agency_admin_delete_clients"
ON clients
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- Team Member: pode visualizar clientes da agência
CREATE POLICY "team_member_select_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_member')
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- Client User: pode visualizar seu próprio cliente
CREATE POLICY "client_user_select_own_client"
ON clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_user')
  AND id = public.get_user_client_id(auth.uid())
);