-- Fix infinite recursion in clients table RLS policies
-- Remove all existing policies that cause recursion
DROP POLICY IF EXISTS "Super admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can view their clients" ON clients;
DROP POLICY IF EXISTS "Client users can view their client" ON clients;
DROP POLICY IF EXISTS "Approvers can view their clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can update their clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can delete their clients" ON clients;
DROP POLICY IF EXISTS "Super admins can manage all clients" ON clients;

-- CREATE NEW SELECT POLICIES (using user_roles to avoid recursion)

-- Super admins can view all clients
CREATE POLICY "Super admins can view all clients"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  )
);

-- Agency admins can view their agency clients
CREATE POLICY "Agency admins can view their agency clients"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'agency_admin'
      AND p.agency_id = clients.agency_id
  )
);

-- Approvers can view assigned clients
CREATE POLICY "Approvers can view assigned clients"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN client_approvers ca ON ca.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'approver'
      AND ca.client_id = clients.id
      AND ca.is_active = true
  )
);

-- Client users can view their own client
CREATE POLICY "Client users can view their own client"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'client_user'
      AND p.client_id = clients.id
  )
);

-- Team members can view their agency's clients
CREATE POLICY "Team members can view their agency clients"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'team_member'
      AND p.agency_id = clients.agency_id
  )
);

-- CREATE INSERT POLICIES

-- Super admins can insert any client
CREATE POLICY "Super admins can insert clients"
ON clients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  )
);

-- Agency admins can insert clients for their agency
CREATE POLICY "Agency admins can insert clients"
ON clients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'agency_admin'
      AND p.agency_id = clients.agency_id
  )
);

-- CREATE UPDATE POLICIES

-- Super admins can update any client
CREATE POLICY "Super admins can update clients"
ON clients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  )
);

-- Agency admins can update their clients
CREATE POLICY "Agency admins can update their clients"
ON clients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'agency_admin'
      AND p.agency_id = clients.agency_id
  )
);

-- CREATE DELETE POLICIES

-- Super admins can delete any client
CREATE POLICY "Super admins can delete clients"
ON clients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  )
);

-- Agency admins can delete their clients
CREATE POLICY "Agency admins can delete their clients"
ON clients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'agency_admin'
      AND p.agency_id = clients.agency_id
  )
);

-- Add documentation comments
COMMENT ON POLICY "Super admins can view all clients" ON clients IS 
  'Super admins têm acesso total a todos os clientes - verifica role via user_roles';

COMMENT ON POLICY "Agency admins can view their agency clients" ON clients IS 
  'Agency admins veem apenas clientes da sua agência - usa user_roles + profiles.agency_id sem verificar profiles.role';

COMMENT ON POLICY "Approvers can view assigned clients" ON clients IS 
  'Aprovadores veem apenas clientes atribuídos via client_approvers - usa user_roles para evitar recursão';

COMMENT ON POLICY "Client users can view their own client" ON clients IS 
  'Usuários cliente veem apenas seu próprio cliente - usa user_roles + profiles.client_id';

COMMENT ON POLICY "Team members can view their agency clients" ON clients IS 
  'Membros de equipe veem clientes da sua agência - usa user_roles + profiles.agency_id';