-- Criar tabela para templates de texto/roteiros
CREATE TABLE IF NOT EXISTS ai_text_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('caption', 'script')),
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  category TEXT,
  tone TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_text_templates_agency ON ai_text_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_ai_text_templates_type ON ai_text_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_ai_text_templates_active ON ai_text_templates(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ai_text_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_text_templates_updated_at
BEFORE UPDATE ON ai_text_templates
FOR EACH ROW
EXECUTE FUNCTION update_ai_text_templates_updated_at();

-- RLS Policies
ALTER TABLE ai_text_templates ENABLE ROW LEVEL SECURITY;

-- Super admin pode tudo
CREATE POLICY "Super admin full access on ai_text_templates"
ON ai_text_templates
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency admin pode gerenciar templates da própria agência
CREATE POLICY "Agency admin can manage own templates"
ON ai_text_templates
FOR ALL
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = get_user_agency_id(auth.uid())
);

-- Usuários podem ler templates da própria agência (para IA usar)
CREATE POLICY "Users can read own agency templates"
ON ai_text_templates
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid()) OR
  has_role(auth.uid(), 'super_admin')
);