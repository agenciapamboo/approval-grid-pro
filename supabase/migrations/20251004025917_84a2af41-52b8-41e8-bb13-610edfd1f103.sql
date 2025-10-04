-- Adicionar campos cadastrais à tabela clients
ALTER TABLE clients
ADD COLUMN cnpj TEXT,
ADD COLUMN plan_renewal_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN website TEXT,
ADD COLUMN whatsapp TEXT,
ADD COLUMN address TEXT;