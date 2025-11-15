-- Primeiro, remover a constraint de NOT NULL em agency_id se existir
ALTER TABLE kanban_columns ALTER COLUMN agency_id DROP NOT NULL;

-- Limpar colunas existentes (apenas para inicialização)
DELETE FROM kanban_columns;

-- Inserir as 6 colunas padrão do sistema (is_system = true)
-- agency_id = NULL indica colunas globais do sistema

INSERT INTO kanban_columns (
  agency_id,
  column_id,
  column_name,
  column_color,
  column_order,
  is_system
) VALUES
  -- Coluna 1: Solicitações (requests de clientes + ajustes)
  (NULL, 'solicitacoes', 'Solicitações', '#EF4444', 1, true),
  
  -- Coluna 2: Em Produção (plano de conteúdo)
  (NULL, 'em_producao', 'Em Produção', '#F59E0B', 2, true),
  
  -- Coluna 3: Em Revisão (draft, in_review)
  (NULL, 'em_revisao', 'Em Revisão', '#3B82F6', 3, true),
  
  -- Coluna 4: Aprovados
  (NULL, 'aprovados', 'Aprovados', '#10B981', 4, true),
  
  -- Coluna 5: Agendados
  (NULL, 'agendados', 'Agendados', '#8B5CF6', 5, true),
  
  -- Coluna 6: Publicados (após agendamento ou deadline)
  (NULL, 'publicados', 'Publicados', '#6B7280', 6, true);

-- Criar função que valida se pode deletar
CREATE OR REPLACE FUNCTION prevent_delete_system_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Não é permitido deletar colunas do sistema';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para prevenir deleção
DROP TRIGGER IF EXISTS trigger_prevent_delete_system_columns ON kanban_columns;
CREATE TRIGGER trigger_prevent_delete_system_columns
  BEFORE DELETE ON kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION prevent_delete_system_columns();