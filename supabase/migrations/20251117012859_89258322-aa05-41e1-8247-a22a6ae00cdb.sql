-- Política RLS para permitir UPDATE em client_approvers
CREATE POLICY "Users can update approvers of their client"
  ON public.client_approvers
  FOR UPDATE
  TO authenticated
  USING (
    -- Client users podem atualizar aprovadores de seu cliente
    (
      has_role(auth.uid(), 'client_user')
      AND client_id = get_user_client_id(auth.uid())
    )
    OR
    -- Agency admins podem atualizar aprovadores de clientes de sua agência
    (
      has_role(auth.uid(), 'agency_admin')
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
    )
    OR
    -- Super admins podem atualizar qualquer aprovador
    has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    -- Client users podem atualizar aprovadores de seu cliente
    (
      has_role(auth.uid(), 'client_user')
      AND client_id = get_user_client_id(auth.uid())
    )
    OR
    -- Agency admins podem atualizar aprovadores de clientes de sua agência
    (
      has_role(auth.uid(), 'agency_admin')
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
    )
    OR
    -- Super admins podem atualizar qualquer aprovador
    has_role(auth.uid(), 'super_admin')
  );