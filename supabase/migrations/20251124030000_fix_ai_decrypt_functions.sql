-- Adicionar funções de criptografia/descriptografia para chaves de IA
-- Estas funções são necessárias para o sistema de IA funcionar corretamente

-- ===================================
-- FUNÇÕES DE CRIPTOGRAFIA
-- ===================================

-- Função para criptografar chave OpenAI
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF plain_key IS NULL OR plain_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Usar chave específica para API keys (diferente dos tokens sociais)
  encryption_key := md5(current_database()::text || 'ai_api_keys_secret_v1');
  
  -- Criptografar usando pgcrypto
  RETURN pgp_sym_encrypt(plain_key, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to encrypt API key: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Função para descriptografar chave OpenAI
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decryption_key text;
BEGIN
  IF encrypted_key IS NULL OR encrypted_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Usar mesma chave para descriptografar
  decryption_key := md5(current_database()::text || 'ai_api_keys_secret_v1');
  
  -- Descriptografar usando pgcrypto
  RETURN pgp_sym_decrypt(encrypted_key::bytea, decryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to decrypt API key: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Adicionar comentários para documentação
COMMENT ON FUNCTION encrypt_api_key(text) IS 'Encrypts OpenAI API keys using pgcrypto PGP symmetric encryption';
COMMENT ON FUNCTION decrypt_api_key(text) IS 'Decrypts OpenAI API keys - only use in SECURITY DEFINER functions or Edge Functions';


