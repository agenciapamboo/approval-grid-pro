-- Fase 1: Adicionar rastreamento de aprovadores (com correção de dados existentes)

-- 1. Backup de approval_tokens antes de eventual remoção
CREATE TABLE IF NOT EXISTS approval_tokens_backup AS 
SELECT *, now() as backup_date 
FROM approval_tokens;

-- 2. Modificar tabela comments para rastrear aprovadores
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES client_approvers(id),
ADD COLUMN IF NOT EXISTS approver_name text;

-- Tornar author_user_id nullable (se já não for)
ALTER TABLE comments 
ALTER COLUMN author_user_id DROP NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_comments_approver_id ON comments(approver_id);

-- IMPORTANTE: Não adicionar constraint check_comment_author por enquanto
-- pois existem comentários legados de aprovadores via approval_token
-- que têm author_user_id = NULL e approver_id = NULL
-- Esses serão corrigidos quando migrarmos o sistema

-- 3. Modificar tabela activity_log para rastrear aprovadores
ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES client_approvers(id),
ADD COLUMN IF NOT EXISTS approver_name text;

-- Tornar actor_user_id nullable
ALTER TABLE activity_log 
ALTER COLUMN actor_user_id DROP NOT NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_activity_log_approver_id ON activity_log(approver_id);

-- 4. Modificar tabela content_texts para rastrear edições
ALTER TABLE content_texts
ADD COLUMN IF NOT EXISTS edited_by_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edited_by_approver_id uuid REFERENCES client_approvers(id),
ADD COLUMN IF NOT EXISTS edited_by_approver_name text,
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT now();

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_content_texts_user ON content_texts(edited_by_user_id);
CREATE INDEX IF NOT EXISTS idx_content_texts_approver ON content_texts(edited_by_approver_id);