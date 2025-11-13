-- ============================================
-- FASE 1: CORRIGIR RECURSÃO RLS EM CLIENTS
-- ============================================

-- Remover policy duplicada que causa recursão infinita
DROP POLICY IF EXISTS "Users can view their own client" ON clients;

-- Políticas já existentes (validar que estão corretas):
-- ✅ "Client users can view their client"
-- ✅ "Agency admins can view their clients"  
-- ✅ "Approvers can view their clients"
-- ✅ "Super admins can view all clients"

-- ============================================
-- FASE 3: SIMPLIFICAR PERMISSÕES - APENAS 10 ESSENCIAIS
-- ============================================

-- Limpar TODAS as permissões granulares desnecessárias
DELETE FROM role_permissions 
WHERE permission_key NOT IN (
  'view_content',
  'create_content', 
  'edit_content',
  'delete_content',
  'approve_content',
  'add_comment',
  'manage_clients',
  'manage_approvers',
  'view_analytics',
  'manage_settings'
);

-- Configurar as 10 permissões essenciais para cada role
-- Limpar e reinserir permissões corretas
DELETE FROM role_permissions;

INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  -- Super Admin (todas as permissões)
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
  
  -- Agency Admin (gerencia clientes e conteúdos)
  ('agency_admin', 'view_content', true),
  ('agency_admin', 'create_content', true),
  ('agency_admin', 'edit_content', true),
  ('agency_admin', 'delete_content', true),
  ('agency_admin', 'add_comment', true),
  ('agency_admin', 'manage_clients', true),
  ('agency_admin', 'manage_approvers', true),
  ('agency_admin', 'view_analytics', true),
  
  -- Team Member (cria e edita conteúdos)
  ('team_member', 'view_content', true),
  ('team_member', 'create_content', true),
  ('team_member', 'edit_content', true),
  ('team_member', 'add_comment', true),
  
  -- Client User (visualiza e comenta)
  ('client_user', 'view_content', true),
  ('client_user', 'add_comment', true),
  ('client_user', 'manage_approvers', true),
  
  -- Approver (aprova e edita conteúdos)
  ('approver', 'view_content', true),
  ('approver', 'approve_content', true),
  ('approver', 'edit_content', true),
  ('approver', 'add_comment', true);

-- Log da simplificação
INSERT INTO activity_log (entity, action, metadata)
VALUES (
  'system',
  'permissions_simplified',
  jsonb_build_object(
    'total_permissions', 10,
    'roles_updated', 5,
    'simplified_at', now()
  )
);