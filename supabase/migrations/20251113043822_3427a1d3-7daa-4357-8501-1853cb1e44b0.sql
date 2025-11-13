-- ============================================
-- SIMPLIFICAÇÃO DO SISTEMA - APENAS USUÁRIOS AUTENTICADOS
-- ============================================

-- 1. Garantir que aprovadores tenham user_id (para futura migração)
--    Preparar para que aprovadores também sejam usuários auth
ALTER TABLE client_approvers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_approvers_user_id ON client_approvers(user_id);

-- 2. Simplificar role_permissions - manter apenas 5 roles principais
DELETE FROM role_permissions 
WHERE role NOT IN ('super_admin', 'agency_admin', 'team_member', 'client_user', 'approver');

-- 3. Garantir permissões básicas para as 5 roles
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  -- Super Admin (tudo)
  ('super_admin', 'view_content', true),
  ('super_admin', 'create_content', true),
  ('super_admin', 'edit_content', true),
  ('super_admin', 'delete_content', true),
  ('super_admin', 'approve_content', true),
  ('super_admin', 'add_comment', true),
  ('super_admin', 'manage_clients', true),
  ('super_admin', 'manage_approvers', true),
  ('super_admin', 'view_analytics', true),
  ('super_admin', 'manage_settings', true),
  
  -- Agency Admin
  ('agency_admin', 'view_content', true),
  ('agency_admin', 'create_content', true),
  ('agency_admin', 'edit_content', true),
  ('agency_admin', 'delete_content', true),
  ('agency_admin', 'add_comment', true),
  ('agency_admin', 'manage_clients', true),
  ('agency_admin', 'manage_approvers', true),
  ('agency_admin', 'view_analytics', true),
  
  -- Team Member
  ('team_member', 'view_content', true),
  ('team_member', 'create_content', true),
  ('team_member', 'edit_content', true),
  ('team_member', 'add_comment', true),
  
  -- Client User
  ('client_user', 'view_content', true),
  ('client_user', 'add_comment', true),
  ('client_user', 'manage_approvers', true),
  
  -- Approver
  ('approver', 'view_content', true),
  ('approver', 'approve_content', true),
  ('approver', 'add_comment', true),
  ('approver', 'edit_content', true)
ON CONFLICT (role, permission_key) DO UPDATE 
SET enabled = EXCLUDED.enabled, updated_at = now();

-- 4. RLS Policies para approvers autenticados
-- Approvers podem ver conteúdo dos seus clientes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contents' 
    AND policyname = 'Approvers can view their client content'
  ) THEN
    CREATE POLICY "Approvers can view their client content"
      ON contents FOR SELECT
      USING (
        client_id IN (
          SELECT client_id FROM client_approvers 
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- Approvers podem adicionar comentários
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'comments' 
    AND policyname = 'Approvers can add comments'
  ) THEN
    CREATE POLICY "Approvers can add comments"
      ON comments FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM client_approvers 
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- 5. Limpar sessions antigas de 2FA (não mais necessárias)
-- Manter tabelas para histórico mas desabilitar lógica 2FA futura
COMMENT ON TABLE client_sessions IS 'DEPRECATED: Mantido apenas para histórico. Sistema agora usa auth.users para aprovadores.';
COMMENT ON TABLE two_factor_codes IS 'DEPRECATED: Mantido apenas para histórico. Sistema agora usa auth.users para aprovadores.';