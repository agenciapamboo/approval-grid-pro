-- Adicionar políticas RLS DELETE para user_roles
-- Isso permite que agency_admin e super_admin removam team members

-- Drop políticas antigas se existirem (cleanup)
DROP POLICY IF EXISTS "Agency admins can delete team member roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can delete any role" ON user_roles;

-- Política 1: Agency Admin pode deletar roles 'team_member' da sua agência
CREATE POLICY "Agency admins can delete team member roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin'::app_role)
  AND role = 'team_member'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.agency_id = get_user_agency_id(auth.uid())
  )
);

-- Política 2: Super Admin pode deletar qualquer role
CREATE POLICY "Super admins can delete any role"
ON user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Log de auditoria
COMMENT ON POLICY "Agency admins can delete team member roles" ON user_roles IS 
  'Permite que agency_admin delete roles team_member apenas da sua agência';
COMMENT ON POLICY "Super admins can delete any role" ON user_roles IS 
  'Permite que super_admin delete qualquer role para gerenciamento do sistema';