-- Criar política RLS para agency_admins verem roles dos membros de sua agência
CREATE POLICY "Agency admins can view team member roles"
ON user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'agency_admin'
    )
  )
);

-- Criar política para team_members verem roles de colegas da mesma agência
CREATE POLICY "Team members can view colleague roles"
ON user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.agency_id = p2.agency_id
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'team_member'
    )
  )
);