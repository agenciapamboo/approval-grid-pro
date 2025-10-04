-- Adicionar campo email à tabela clients
ALTER TABLE public.clients ADD COLUMN email text;

-- Criar índice único para email
CREATE UNIQUE INDEX clients_email_unique ON public.clients(email) WHERE email IS NOT NULL;