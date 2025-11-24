-- Corrigir estrutura e permissões para geração de perfil de cliente com IA

-- ===================================
-- 1. CORRIGIR TABELA client_ai_profiles
-- ===================================

-- Remover constraint UNIQUE(client_id, created_at) e substituir por UNIQUE(client_id)
ALTER TABLE public.client_ai_profiles 
DROP CONSTRAINT IF EXISTS client_ai_profiles_client_id_created_at_key;

-- Adicionar constraint UNIQUE apenas em client_id para permitir upsert
ALTER TABLE public.client_ai_profiles 
ADD CONSTRAINT client_ai_profiles_client_id_key UNIQUE (client_id);

-- Adicionar coluna ai_generated_profile para armazenar resposta completa da IA
ALTER TABLE public.client_ai_profiles 
ADD COLUMN IF NOT EXISTS ai_generated_profile JSONB;

-- Adicionar coluna editorial_line (TEXT) se não existir
ALTER TABLE public.client_ai_profiles 
ADD COLUMN IF NOT EXISTS editorial_line TEXT;

-- ===================================
-- 2. CORRIGIR PERMISSÕES ai_configurations
-- ===================================

-- Permitir que agency_admin leia as configurações de IA (mas não modifique)
DROP POLICY IF EXISTS "agency_admin_read_ai_config" ON public.ai_configurations;

CREATE POLICY "agency_admin_read_ai_config" ON public.ai_configurations
  FOR SELECT 
  USING (has_role(auth.uid(), 'agency_admin'));

-- ===================================
-- 3. COMENTÁRIOS
-- ===================================

COMMENT ON COLUMN client_ai_profiles.ai_generated_profile IS 'Resposta completa da IA em formato JSON';
COMMENT ON COLUMN client_ai_profiles.editorial_line IS 'Linha editorial sugerida pela IA';
COMMENT ON COLUMN client_ai_profiles.profile_summary IS 'Resumo do perfil do cliente';
COMMENT ON COLUMN client_ai_profiles.target_persona IS 'Persona alvo em formato JSON (age_range, interests, pain_points)';
COMMENT ON COLUMN client_ai_profiles.content_pillars IS 'Pilares de conteúdo sugeridos';
COMMENT ON COLUMN client_ai_profiles.tone_of_voice IS 'Tom de voz sugerido';
COMMENT ON COLUMN client_ai_profiles.keywords IS 'Palavras-chave relevantes';

COMMENT ON POLICY "agency_admin_read_ai_config" ON public.ai_configurations IS 
'Permite agency_admin ler configurações de IA para usar nas funcionalidades de geração de conteúdo';
