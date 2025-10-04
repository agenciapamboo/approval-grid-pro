-- Adicionar campos de tipo de plano e data de último pagamento na tabela agencies
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS plan_type text CHECK (plan_type IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.agencies.plan_type IS 'Tipo de renovação do plano: monthly (mensal) ou annual (anual)';
COMMENT ON COLUMN public.agencies.last_payment_date IS 'Data do último pagamento recebido';

-- Atualizar a policy de update para permitir que super_admins atualizem agências
DROP POLICY IF EXISTS "Super admins can update agencies" ON public.agencies;

CREATE POLICY "Super admins can update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);