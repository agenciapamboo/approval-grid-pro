-- Adicionar campo category na tabela contents para diferenciar conteúdos de rede social vs avulsos
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('social', 'avulso')) DEFAULT 'social';

-- Atualizar conteúdos existentes para garantir que tenham a categoria padrão
UPDATE contents SET category = 'social' WHERE category IS NULL;