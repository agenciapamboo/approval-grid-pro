-- Ajustar política de DELETE para contents
-- Permitir que usuários responsáveis pela agência possam deletar conteúdos

DROP POLICY IF EXISTS "Agency admins can delete contents" ON public.contents;

CREATE POLICY "Agency admins can delete contents"
ON public.contents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid() 
    AND has_role(auth.uid(), 'agency_admin') 
    AND c.id = contents.client_id
  )
  OR
  -- Permitir que o próprio criador delete
  owner_user_id = auth.uid()
);