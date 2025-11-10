-- Adicionar coluna supplier_link à tabela contents
ALTER TABLE contents 
ADD COLUMN IF NOT EXISTS supplier_link TEXT;

-- Criar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_contents_supplier_link ON contents(supplier_link) WHERE supplier_link IS NOT NULL;

-- Adicionar comentário descritivo
COMMENT ON COLUMN contents.supplier_link IS 'Link do Google Drive, iCloud ou outro serviço para download de arquivos fechados pelo fornecedor';