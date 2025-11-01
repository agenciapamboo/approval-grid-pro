-- Add encrypted columns for sensitive data in agencies table
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS email_encrypted text,
ADD COLUMN IF NOT EXISTS whatsapp_encrypted text,
ADD COLUMN IF NOT EXISTS webhook_url_encrypted text;

-- Migrate existing sensitive data to encrypted columns
UPDATE agencies
SET 
  email_encrypted = encrypt_social_token(email),
  whatsapp_encrypted = encrypt_social_token(whatsapp),
  webhook_url_encrypted = encrypt_social_token(webhook_url)
WHERE (email IS NOT NULL AND email_encrypted IS NULL)
   OR (whatsapp IS NOT NULL AND whatsapp_encrypted IS NULL)
   OR (webhook_url IS NOT NULL AND webhook_url_encrypted IS NULL);

-- Create public view with only safe, non-sensitive data
CREATE OR REPLACE VIEW agencies_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  brand_primary,
  brand_secondary,
  created_at
FROM agencies;

-- Grant access to public view
GRANT SELECT ON agencies_public TO anon;
GRANT SELECT ON agencies_public TO authenticated;

-- Remove the dangerous public policy from agencies table
DROP POLICY IF EXISTS "Anyone can view agencies by slug" ON agencies;

-- Create secure view for authorized users with decrypted data
CREATE OR REPLACE VIEW agencies_secure AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  brand_primary,
  brand_secondary,
  decrypt_social_token(email_encrypted) as email,
  decrypt_social_token(whatsapp_encrypted) as whatsapp,
  decrypt_social_token(webhook_url_encrypted) as webhook_url,
  plan,
  plan_type,
  plan_renewal_date,
  last_payment_date,
  created_at,
  updated_at
FROM agencies;

-- Add RLS to secure view (only agency admins and super admins can access)
ALTER VIEW agencies_secure SET (security_invoker = on);

-- Add helpful comments
COMMENT ON VIEW agencies_public IS 'Public view of agencies containing only non-sensitive branding information (name, slug, logo, colors). Safe for public access.';
COMMENT ON VIEW agencies_secure IS 'Secure view with decrypted sensitive data. Only accessible to agency admins and super admins. Use only in authorized contexts.';
COMMENT ON COLUMN agencies.email_encrypted IS 'Encrypted email address. Never expose to public.';
COMMENT ON COLUMN agencies.whatsapp_encrypted IS 'Encrypted WhatsApp phone number. Never expose to public.';
COMMENT ON COLUMN agencies.webhook_url_encrypted IS 'Encrypted webhook URL containing potentially sensitive endpoints. Never expose to public.';