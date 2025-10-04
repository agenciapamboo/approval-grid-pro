-- Permitir super admins atualizarem agências
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
);