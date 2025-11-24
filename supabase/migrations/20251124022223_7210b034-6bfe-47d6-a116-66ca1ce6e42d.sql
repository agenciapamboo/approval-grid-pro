-- Adicionar novos campos à tabela ai_text_templates para templates de texto
ALTER TABLE ai_text_templates
ADD COLUMN IF NOT EXISTS text_structure TEXT,
ADD COLUMN IF NOT EXISTS example TEXT,
ADD COLUMN IF NOT EXISTS structure_link TEXT;

-- Comentários para documentação
COMMENT ON COLUMN ai_text_templates.text_structure IS 'Estrutura de texto que a IA deve seguir';
COMMENT ON COLUMN ai_text_templates.example IS 'Exemplo prático do template aplicado';
COMMENT ON COLUMN ai_text_templates.structure_link IS 'Link de referência para estrutura aplicada (opcional)';