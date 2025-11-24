-- Corrigir RLS policies para permitir acesso a templates globais (agency_id NULL)
-- Templates globais são criados por super_admin e devem ser acessíveis por todas as agências

-- ===================================
-- CORRIGIR RLS POLICIES
-- ===================================

-- Remover policy antiga que não inclui templates globais
DROP POLICY IF EXISTS "Users can read own agency templates" ON ai_text_templates;

-- Criar nova policy que inclui templates da agência E templates globais
CREATE POLICY "Users can read own agency and global templates"
ON ai_text_templates
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid()) OR  -- Templates da própria agência
  agency_id IS NULL OR                             -- Templates globais (criados por super_admin)
  has_role(auth.uid(), 'super_admin')             -- Super admin vê tudo
);

-- Adicionar comentário para documentação
COMMENT ON POLICY "Users can read own agency and global templates" ON ai_text_templates IS 
'Permite que usuários vejam templates da própria agência E templates globais (agency_id NULL) criados por super_admin';


