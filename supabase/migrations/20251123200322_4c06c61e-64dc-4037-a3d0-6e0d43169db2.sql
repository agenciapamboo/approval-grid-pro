-- Fase 1: Infraestrutura Base + Sistema de Cache + Limites por Plano

-- ===================================
-- 1. EXTENSÕES E FUNÇÕES DE CRIPTOGRAFIA
-- ===================================

-- Ativar extensão pgcrypto para criptografia de API keys
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================
-- 2. TABELA AI_CONFIGURATIONS
-- ===================================

CREATE TABLE IF NOT EXISTS public.ai_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_api_key_encrypted text, -- Chave criptografada com pgcrypto
  selected_models jsonb DEFAULT '["gpt-4o-mini", "gpt-4o"]'::jsonb,
  default_model text DEFAULT 'gpt-4o-mini',
  whisper_model text DEFAULT 'whisper-1',
  vision_model text DEFAULT 'gpt-4o',
  max_tokens_caption int DEFAULT 500,
  max_tokens_briefing int DEFAULT 2000,
  temperature numeric DEFAULT 0.7,
  prompt_skills text DEFAULT 'Você é um assistente especializado em marketing digital e criação de conteúdo.',
  prompt_behavior text DEFAULT 'Seja criativo, objetivo e sempre mantenha a consistência com a identidade da marca.',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_ai_configurations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_configurations_updated_at
BEFORE UPDATE ON public.ai_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_configurations_updated_at();

-- ===================================
-- 3. TABELA AI_RESPONSE_CACHE
-- ===================================

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash text NOT NULL UNIQUE, -- MD5 hash do prompt para matching
  prompt_type text NOT NULL, -- 'briefing', 'caption', 'alt_text', 'hashtags'
  model_used text NOT NULL,
  prompt_input jsonb NOT NULL, -- Input original
  ai_response jsonb NOT NULL, -- Resposta da IA
  tokens_used int,
  cost_usd numeric(10,6),
  hit_count int DEFAULT 0, -- Quantas vezes foi reutilizado
  last_hit_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days') -- Cache expira em 90 dias
);

CREATE INDEX idx_ai_cache_hash ON public.ai_response_cache(prompt_hash);
CREATE INDEX idx_ai_cache_type ON public.ai_response_cache(prompt_type);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at);

-- ===================================
-- 4. ATUALIZAR PLAN_ENTITLEMENTS
-- ===================================

ALTER TABLE public.plan_entitlements 
ADD COLUMN IF NOT EXISTS ai_uses_limit int;

-- Definir limites por plano
UPDATE public.plan_entitlements SET ai_uses_limit = 10 WHERE plan = 'creator';
UPDATE public.plan_entitlements SET ai_uses_limit = 100 WHERE plan = 'eugencia';
UPDATE public.plan_entitlements SET ai_uses_limit = 300 WHERE plan = 'socialmidia';
UPDATE public.plan_entitlements SET ai_uses_limit = 500 WHERE plan = 'fullservice';
UPDATE public.plan_entitlements SET ai_uses_limit = NULL WHERE plan = 'unlimited'; -- Sem limite

-- ===================================
-- 5. TABELA AI_USAGE_LOGS
-- ===================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  agency_id uuid,
  client_id uuid,
  feature text NOT NULL, -- 'briefing', 'caption', 'alt_text', 'hashtags', 'audio_transcription'
  model_used text NOT NULL,
  tokens_used int,
  cost_usd numeric(10,6),
  from_cache boolean DEFAULT false, -- Se veio do cache (não conta no limite)
  request_payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_user ON public.ai_usage_logs(user_id, created_at);
CREATE INDEX idx_ai_usage_agency ON public.ai_usage_logs(agency_id, created_at);
CREATE INDEX idx_ai_usage_client ON public.ai_usage_logs(client_id, created_at);
CREATE INDEX idx_ai_usage_feature ON public.ai_usage_logs(feature, created_at);

-- ===================================
-- 6. RLS POLICIES
-- ===================================

-- ai_configurations: apenas super_admin
ALTER TABLE public.ai_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_ai_config" ON public.ai_configurations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- ai_response_cache: system-only (sem acesso direto de usuários)
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_only_ai_cache" ON public.ai_response_cache
  FOR ALL USING (false); -- Apenas edge functions acessam

-- ai_usage_logs: leitura por super_admin e própria agência
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_view_all_usage" ON public.ai_usage_logs
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "agency_view_own_usage" ON public.ai_usage_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'agency_admin') AND 
    agency_id = get_user_agency_id(auth.uid())
  );

-- System can insert usage logs
CREATE POLICY "system_insert_usage_logs" ON public.ai_usage_logs
  FOR INSERT WITH CHECK (true);