-- Add encrypted column for access tokens  
ALTER TABLE client_social_accounts 
ADD COLUMN IF NOT EXISTS access_token_encrypted text;

-- Create function to obfuscate/encrypt access tokens using base64 + XOR
CREATE OR REPLACE FUNCTION encrypt_social_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  token_bytes bytea;
  key_bytes bytea;
  encrypted_bytes bytea;
  i integer;
BEGIN
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Generate a project-specific key
  encryption_key := md5(current_database()::text || 'social_tokens_secret_v1');
  
  -- Convert to bytea
  token_bytes := token::bytea;
  key_bytes := encryption_key::bytea;
  
  -- Simple XOR encryption (better than plain text, not perfect but secure enough with proper access control)
  encrypted_bytes := token_bytes;
  FOR i IN 0..length(token_bytes)-1 LOOP
    encrypted_bytes := set_byte(
      encrypted_bytes, 
      i, 
      get_byte(token_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
    );
  END LOOP;
  
  -- Return as base64 to make it unreadable
  RETURN encode(encrypted_bytes, 'base64');
END;
$$;

-- Create function to decrypt/deobfuscate access tokens
CREATE OR REPLACE FUNCTION decrypt_social_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  encrypted_bytes bytea;
  key_bytes bytea;
  decrypted_bytes bytea;
  i integer;
BEGIN
  IF encrypted_token IS NULL OR encrypted_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use same project-specific key
  encryption_key := md5(current_database()::text || 'social_tokens_secret_v1');
  
  -- Decode from base64
  encrypted_bytes := decode(encrypted_token, 'base64');
  key_bytes := encryption_key::bytea;
  
  -- XOR decryption (same operation as encryption)
  decrypted_bytes := encrypted_bytes;
  FOR i IN 0..length(encrypted_bytes)-1 LOOP
    decrypted_bytes := set_byte(
      decrypted_bytes,
      i,
      get_byte(encrypted_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
    );
  END LOOP;
  
  RETURN convert_from(decrypted_bytes, 'UTF8');
END;
$$;

-- Migrate existing tokens to encrypted format
UPDATE client_social_accounts
SET access_token_encrypted = encrypt_social_token(access_token)
WHERE access_token IS NOT NULL AND (access_token_encrypted IS NULL OR access_token_encrypted = '');

-- Create secure view for accessing decrypted tokens
CREATE OR REPLACE VIEW client_social_accounts_decrypted AS
SELECT 
  id,
  client_id,
  platform,
  account_id,
  account_name,
  page_id,
  instagram_business_account_id,
  decrypt_social_token(access_token_encrypted) as access_token,
  token_expires_at,
  is_active,
  created_at,
  updated_at
FROM client_social_accounts;

-- Add helpful comments
COMMENT ON COLUMN client_social_accounts.access_token_encrypted IS 'Obfuscated OAuth access token. Tokens are encrypted using XOR cipher with project-specific key and base64 encoded.';
COMMENT ON FUNCTION encrypt_social_token(text) IS 'Encrypts social media access tokens using XOR cipher with base64 encoding';
COMMENT ON FUNCTION decrypt_social_token(text) IS 'Decrypts social media access tokens - only use in server-side SECURITY DEFINER functions';
COMMENT ON VIEW client_social_accounts_decrypted IS 'Secure view with decrypted tokens. Only use in edge functions, never expose to client code.';