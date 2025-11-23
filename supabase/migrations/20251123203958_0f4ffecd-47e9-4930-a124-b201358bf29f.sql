-- Adicionar campos de IA na tabela contents
ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_features_used JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN contents.ai_generated IS 'Indica se o conteúdo foi criado com ajuda de IA';
COMMENT ON COLUMN contents.ai_features_used IS 'Array de features de IA usadas: ["caption", "image_analysis", "suggestion"]';

-- Índice para filtrar conteúdos gerados com IA
CREATE INDEX IF NOT EXISTS idx_contents_ai_generated ON contents(ai_generated) WHERE ai_generated = TRUE;