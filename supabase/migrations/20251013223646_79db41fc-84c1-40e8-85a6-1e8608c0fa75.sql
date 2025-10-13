-- Adicionar política RLS para permitir super admins deletarem agências
CREATE POLICY "Super admins can delete agencies"
ON public.agencies
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);