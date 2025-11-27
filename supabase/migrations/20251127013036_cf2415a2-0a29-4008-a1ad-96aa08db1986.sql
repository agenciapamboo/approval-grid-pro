-- Create decrypt_api_key function using vault extension
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_value text;
BEGIN
  -- Check if encrypted_key is null or empty
  IF encrypted_key IS NULL OR encrypted_key = '' THEN
    RETURN NULL;
  END IF;

  -- Try to decrypt using vault.decrypted_secrets
  -- If it fails or returns null, return the key as-is (assuming it might not be encrypted)
  BEGIN
    SELECT decrypted_secret INTO decrypted_value
    FROM vault.decrypted_secrets
    WHERE name = 'openai_api_key'
    LIMIT 1;
    
    -- If we found a decrypted value in vault, return it
    IF decrypted_value IS NOT NULL THEN
      RETURN decrypted_value;
    END IF;
    
    -- Otherwise, assume the key stored in ai_configurations is the actual key
    RETURN encrypted_key;
  EXCEPTION WHEN OTHERS THEN
    -- If vault lookup fails, return the key as-is
    RETURN encrypted_key;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrypt_api_key(text) TO authenticated;