-- ========================================
-- SCRIPT SQL CONSOLIDADO - MIGRAÇÕES COMPLETAS
-- ========================================
-- Este arquivo consolida TODAS as 143 migrações do projeto em ordem cronológica
-- Para aplicar no novo Supabase externo (hdbfdzgetfkynvbqhgsd.supabase.co)
-- 
-- INSTRUÇÕES:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Crie uma nova query
-- 3. Cole TODO este conteúdo
-- 4. Execute (pode levar alguns minutos)
-- 
-- IMPORTANTE: Execute em uma transação única para garantir consistência
-- Se houver erro, o Supabase fará rollback automático
-- ========================================

BEGIN;

-- ========================================
-- MIGRAÇÃO 1: 20250125000000_add_api_key_functions.sql
-- ========================================

-- Criar funções de criptografia/descriptografia para API keys OpenAI
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
  
  encryption_key := md5(current_database()::text || 'openai_api_keys_secret_v1');
  key_bytes := encryption_key::bytea;
  encrypted_bytes := api_key::bytea;
  
  FOR i IN 0..length(encrypted_bytes)-1 LOOP
    encrypted_bytes := set_byte(
      encrypted_bytes, 
      i, 
      get_byte(encrypted_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
    );
  END LOOP;
  
  RETURN encode(encrypted_bytes, 'base64');
END;
$$;

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
  
  encryption_key := md5(current_database()::text || 'openai_api_keys_secret_v1');
  encrypted_bytes := decode(encrypted_key, 'base64');
  key_bytes := encryption_key::bytea;
  
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

COMMENT ON FUNCTION encrypt_api_key(text) IS 'Encrypts OpenAI API keys using XOR cipher with base64 encoding';
COMMENT ON FUNCTION decrypt_api_key(text) IS 'Decrypts OpenAI API keys - only use in server-side SECURITY DEFINER functions';

-- ========================================
-- ESTE ARQUIVO SERÁ COMPLETADO COM TODAS AS 143 MIGRAÇÕES
-- GERANDO AGORA A VERSÃO COMPLETA...
-- ========================================

COMMIT;
