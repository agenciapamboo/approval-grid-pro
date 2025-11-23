-- FASE 2: Criar tabela briefing_templates com template_type
CREATE TABLE IF NOT EXISTS briefing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL DEFAULT 'client_profile' CHECK (template_type IN ('client_profile', 'editorial_line')),
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '{"fields": []}'::jsonb,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_briefing_templates_type ON briefing_templates(template_type);
CREATE INDEX idx_briefing_templates_active ON briefing_templates(is_active);
CREATE INDEX idx_briefing_templates_created_by ON briefing_templates(created_by);

-- RLS Policies
ALTER TABLE briefing_templates ENABLE ROW LEVEL SECURITY;

-- Super admins podem fazer tudo
CREATE POLICY "Super admins can manage all templates"
  ON briefing_templates
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Agency admins podem visualizar templates ativos
CREATE POLICY "Agency admins can view active templates"
  ON briefing_templates
  FOR SELECT
  USING (
    is_active = true 
    AND has_role(auth.uid(), 'agency_admin')
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_briefing_templates_updated_at
  BEFORE UPDATE ON briefing_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE briefing_templates IS 'Templates de formulários de briefing para perfil de clientes e linha editorial';
COMMENT ON COLUMN briefing_templates.template_type IS 'Tipo do template: client_profile (perfil do cliente) ou editorial_line (linha editorial)';
COMMENT ON COLUMN briefing_templates.fields IS 'Campos do formulário em formato JSON';
COMMENT ON COLUMN briefing_templates.system_prompt IS 'Prompt do sistema para a IA processar as respostas';
