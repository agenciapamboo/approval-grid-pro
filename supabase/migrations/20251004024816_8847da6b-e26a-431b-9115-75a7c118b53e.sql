-- Adicionar WITH CHECK à policy de UPDATE para agencies
DROP POLICY IF EXISTS "Super admins can update agencies" ON agencies;

CREATE POLICY "Super admins can update agencies"
ON agencies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Criar uma função para buscar o email do admin da agência
CREATE OR REPLACE FUNCTION get_agency_admin_email(agency_id_param UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.agency_id = agency_id_param
    AND p.role = 'agency_admin'
  LIMIT 1;
$$;