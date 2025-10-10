-- Adicionar política para permitir que agency_admin delete clientes
CREATE POLICY "Agency admins can delete their clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.agency_id = clients.agency_id
      AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);