-- Adicionar campo monthly_creatives à tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS monthly_creatives integer DEFAULT 0;