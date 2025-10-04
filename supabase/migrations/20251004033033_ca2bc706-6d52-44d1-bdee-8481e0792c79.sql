-- Allow agency admins to insert clients for their agency
CREATE POLICY "Agency admins can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND p.role = 'agency_admin'
  )
);

-- Allow agency admins to update their clients
CREATE POLICY "Agency admins can update their clients"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND p.role = 'agency_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND p.role = 'agency_admin'
  )
);