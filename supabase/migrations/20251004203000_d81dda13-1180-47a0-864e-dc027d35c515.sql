-- Adicionar colunas email, whatsapp, plan e plan_renewal_date na tabela agencies
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_renewal_date timestamp with time zone;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.agencies.email IS 'Email de contato da agência';
COMMENT ON COLUMN public.agencies.whatsapp IS 'WhatsApp de contato da agência';
COMMENT ON COLUMN public.agencies.plan IS 'Plano atual da agência (free, basic, premium, etc)';
COMMENT ON COLUMN public.agencies.plan_renewal_date IS 'Data de renovação do plano (calculada automaticamente pelo trigger)';