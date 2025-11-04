-- Add new fields to profiles table for complete registration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document TEXT; -- CPF/CNPJ
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('agency', 'creator'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_plan TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_document ON public.profiles(document);