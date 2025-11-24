-- Corrigir políticas RLS para ai_text_templates
-- Permitir que agency_admin leia templates globais (agency_id = NULL) além dos próprios

-- Remover política antiga que não permite ler templates globais
DROP POLICY IF EXISTS "Users can read own agency templates" ON ai_text_templates;

-- Criar nova política que permite ler templates da própria agência E templates globais
CREATE POLICY "Users can read own agency templates and global templates"
ON ai_text_templates
FOR SELECT
USING (
  -- Super admin pode ler tudo
  has_role(auth.uid(), 'super_admin') OR
  -- Agency admin pode ler templates da própria agência
  (
    has_role(auth.uid(), 'agency_admin') AND
    agency_id = get_user_agency_id(auth.uid())
  ) OR
  -- Agency admin pode ler templates globais (agency_id = NULL)
  (
    has_role(auth.uid(), 'agency_admin') AND
    agency_id IS NULL
  ) OR
  -- Team members podem ler templates da própria agência
  (
    has_role(auth.uid(), 'team_member') AND
    agency_id = get_user_agency_id(auth.uid())
  ) OR
  -- Team members podem ler templates globais
  (
    has_role(auth.uid(), 'team_member') AND
    agency_id IS NULL
  )
);


