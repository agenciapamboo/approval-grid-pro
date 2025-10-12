-- Adicionar campo webhook_url na tabela agencies para integração com n8n
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS webhook_url text;