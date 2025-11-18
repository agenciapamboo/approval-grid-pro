-- Adicionar campo require_approval_to_publish na tabela clients
ALTER TABLE clients
ADD COLUMN require_approval_to_publish BOOLEAN DEFAULT false;

COMMENT ON COLUMN clients.require_approval_to_publish IS 'Quando true, apenas conteúdos aprovados ou agendados serão publicados automaticamente. Quando false (padrão), conteúdos em rascunho também serão publicados.';