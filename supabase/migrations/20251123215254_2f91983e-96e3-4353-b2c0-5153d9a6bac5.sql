-- Criar tabela client_ai_profiles para armazenar perfis de IA dos clientes
CREATE TABLE IF NOT EXISTS public.client_ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Perfil gerado pela IA
  profile_summary TEXT,
  target_persona JSONB,
  content_pillars TEXT[],
  tone_of_voice TEXT[],
  keywords TEXT[],
  
  -- Editorial Line
  communication_objective TEXT,
  post_frequency TEXT,
  best_posting_times TEXT[],
  content_mix JSONB,
  priority_themes TEXT[],
  
  -- Metadados do briefing
  briefing_template_id UUID REFERENCES public.briefing_templates(id),
  briefing_responses JSONB,
  generated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(client_id, created_at)
);

CREATE INDEX idx_client_ai_profiles_client ON client_ai_profiles(client_id);
CREATE INDEX idx_client_ai_profiles_template ON client_ai_profiles(briefing_template_id);

-- RLS Policies
ALTER TABLE client_ai_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON client_ai_profiles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Agency admin access own clients" ON client_ai_profiles
  FOR ALL USING (
    has_role(auth.uid(), 'agency_admin'::app_role) AND
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_ai_profiles.client_id 
      AND clients.agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "Client users view own profile" ON client_ai_profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'client_user'::app_role) AND
    client_id = get_user_client_id(auth.uid())
  );