-- Fase 1: Criar estrutura de roles para aprovadores

-- 1. Criar role 'approver' no enum app_role (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('super_admin', 'agency_admin', 'client_user', 'team_member');
  END IF;
  
  -- Adicionar 'approver' se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'app_role'::regtype 
    AND enumlabel = 'approver'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'approver';
  END IF;
END $$;

-- 2. Adicionar coluna user_id na tabela client_approvers
ALTER TABLE client_approvers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_client_approvers_user_id ON client_approvers(user_id);

-- 4. Comentários para documentação
COMMENT ON COLUMN client_approvers.user_id IS 'Foreign key para auth.users - aprovadores são usuários autenticados do sistema';
COMMENT ON TABLE client_approvers IS 'Tabela de relacionamento entre usuários aprovadores e clientes';