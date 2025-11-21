-- Add enable_auto_publish to clients table
ALTER TABLE clients 
ADD COLUMN enable_auto_publish BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN clients.enable_auto_publish IS 
'Controla se este cliente permite publicações automáticas. Quando false, nenhum conteúdo será publicado automaticamente, mesmo que tenha auto_publish=true';