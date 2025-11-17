-- Política RLS para client_approvers: permitir INSERT se user fornece client_id e created_by
DROP POLICY IF EXISTS "Users can insert approvers for their client" ON public.client_approvers;

CREATE POLICY "Users can insert approvers for their client"
  ON public.client_approvers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Client users podem adicionar aprovadores para seu próprio cliente
    (
      has_role(auth.uid(), 'client_user') 
      AND client_id = get_user_client_id(auth.uid())
      AND created_by = auth.uid()
    )
    OR
    -- Agency admins podem adicionar aprovadores para clientes de sua agência
    (
      has_role(auth.uid(), 'agency_admin')
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
      AND created_by = auth.uid()
    )
  );

-- Política para SELECT de aprovadores
DROP POLICY IF EXISTS "Users can view approvers of their client" ON public.client_approvers;

CREATE POLICY "Users can view approvers of their client"
  ON public.client_approvers
  FOR SELECT
  TO authenticated
  USING (
    -- Client users veem aprovadores de seu cliente
    (
      has_role(auth.uid(), 'client_user')
      AND client_id = get_user_client_id(auth.uid())
    )
    OR
    -- Agency admins veem aprovadores de clientes de sua agência
    (
      has_role(auth.uid(), 'agency_admin')
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
    )
    OR
    -- Super admins veem tudo
    has_role(auth.uid(), 'super_admin')
  );