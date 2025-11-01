-- Fix 1: Remove dangerous public RLS policy on clients table
DROP POLICY IF EXISTS "Anyone can view clients by slug" ON public.clients;

-- Fix 2: Create clients_public view with only non-sensitive fields
CREATE OR REPLACE VIEW public.clients_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  created_at
FROM public.clients;

-- Grant SELECT on public view
GRANT SELECT ON public.clients_public TO anon, authenticated;

-- Fix 3: Encrypt sensitive client fields (email, whatsapp, webhook_url)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS email_encrypted text,
ADD COLUMN IF NOT EXISTS whatsapp_encrypted text,
ADD COLUMN IF NOT EXISTS webhook_url_encrypted text;

-- Migrate existing data to encrypted columns
UPDATE public.clients
SET 
  email_encrypted = encrypt_social_token(email),
  whatsapp_encrypted = encrypt_social_token(whatsapp),
  webhook_url_encrypted = encrypt_social_token(webhook_url)
WHERE email IS NOT NULL OR whatsapp IS NOT NULL OR webhook_url IS NOT NULL;

-- Fix 4: Create clients_secure view for authorized access with decrypted data
CREATE OR REPLACE VIEW public.clients_secure AS
SELECT 
  id,
  agency_id,
  responsible_user_id,
  created_at,
  updated_at,
  plan_renewal_date,
  monthly_creatives,
  notify_email,
  notify_whatsapp,
  notify_webhook,
  name,
  slug,
  logo_url,
  timezone,
  cnpj,
  website,
  address,
  decrypt_social_token(email_encrypted) as email,
  decrypt_social_token(whatsapp_encrypted) as whatsapp,
  decrypt_social_token(webhook_url_encrypted) as webhook_url
FROM public.clients;

-- Grant access to authenticated users
GRANT SELECT ON public.clients_secure TO authenticated;

-- Fix 5: Drop plaintext access_token column from client_social_accounts
ALTER TABLE public.client_social_accounts 
DROP COLUMN IF EXISTS access_token;

-- Make encrypted column NOT NULL after migration
ALTER TABLE public.client_social_accounts 
ALTER COLUMN access_token_encrypted SET NOT NULL;