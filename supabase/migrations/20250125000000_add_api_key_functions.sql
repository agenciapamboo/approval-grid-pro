-- Criar funções de criptografia/descriptografia para API keys OpenAI
-- Usa a mesma lógica de encrypt_social_token mas com chave específica para API keys

-- Função para criptografar API keys
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
  key_bytes bytea;
  encrypted_bytes bytea;
  i integer;
BEGIN
  IF api_key IS NULL OR api_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Generate a project-specific key para API keys (diferente do social tokens)
  encryption_key := md5(current_database()::text || 'openai_api_keys_secret_v1');
  
  -- Convert to bytea
  key_bytes := encryption_key::bytea;
  encrypted_bytes := api_key::bytea;
  
  -- Simple XOR encryption
  FOR i IN 0..length(encrypted_bytes)-1 LOOP
    encrypted_bytes := set_byte(
      encrypted_bytes, 
      i, 
      get_byte(encrypted_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
    );
  END LOOP;
  
  -- Return as base64
  RETURN encode(encrypted_bytes, 'base64');
END;
$$;

-- Função para descriptografar API keys
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key text)
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
  IF encrypted_key IS NULL OR encrypted_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use same project-specific key
  encryption_key := md5(current_database()::text || 'openai_api_keys_secret_v1');
  
  -- Decode from base64
  encrypted_bytes := decode(encrypted_key, 'base64');
  key_bytes := encryption_key::bytea;
  
  -- XOR decryption
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

-- Comentários
COMMENT ON FUNCTION encrypt_api_key(text) IS 'Encrypts OpenAI API keys using XOR cipher with base64 encoding';
COMMENT ON FUNCTION decrypt_api_key(text) IS 'Decrypts OpenAI API keys - only use in server-side SECURITY DEFINER functions';

-- Atualizar política RLS para permitir agency_admin também
DROP POLICY IF EXISTS "super_admin_full_access_ai_config" ON public.ai_configurations;

CREATE POLICY "admin_full_access_ai_config" ON public.ai_configurations
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'agency_admin')
  );

