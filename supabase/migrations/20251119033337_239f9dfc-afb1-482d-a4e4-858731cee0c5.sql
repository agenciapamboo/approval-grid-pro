-- Drop políticas recursivas problemáticas
DROP POLICY IF EXISTS "Agency admins can view team member roles" ON user_roles;
DROP POLICY IF EXISTS "Team members can view colleague roles" ON user_roles;

-- Criar política para agency_admins verem roles dos membros de sua agência
-- Usa has_role() que é SECURITY DEFINER e evita recursão
CREATE POLICY "Agency admins can view team member roles"
ON user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'agency_admin') 
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.agency_id = get_user_agency_id(auth.uid())
  )
);

-- Criar política para team_members verem roles de colegas da mesma agência
CREATE POLICY "Team members can view colleague roles"
ON user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'team_member')
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.agency_id = get_user_agency_id(auth.uid())
  )
);