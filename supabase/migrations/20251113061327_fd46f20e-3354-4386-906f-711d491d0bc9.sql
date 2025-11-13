-- =====================================================
-- ETAPA 1: Corrigir políticas da tabela AGENCIES
-- =====================================================

-- Remover políticas recursivas
DROP POLICY IF EXISTS "Agency admins can view their agency" ON agencies;
DROP POLICY IF EXISTS "Agency admins can update their agency" ON agencies;
DROP POLICY IF EXISTS "Client users can view their associated agency" ON agencies;

-- Recriar políticas usando funções SECURITY DEFINER
CREATE POLICY "Agency admins can view their agency"
ON agencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin') 
  AND id = public.get_user_agency_id(auth.uid())
);

CREATE POLICY "Agency admins can update their agency"
ON agencies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin') 
  AND id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin') 
  AND id = public.get_user_agency_id(auth.uid())
);

CREATE POLICY "Client users can view their associated agency"
ON agencies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_user') 
  AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = public.get_user_client_id(auth.uid())
      AND c.agency_id = agencies.id
  )
);