-- Add unique constraint to profiles.document to prevent duplicate CPF/CNPJ
ALTER TABLE public.profiles
ADD CONSTRAINT unique_document UNIQUE (document);