-- Adicionar 'approver' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'approver';

-- Inserir permissões para role 'approver' (todas as permissões que um aprovador precisa)
INSERT INTO role_permissions (role, permission_key, enabled)
VALUES 
  ('approver', 'view_content', true),
  ('approver', 'approve_content', true),
  ('approver', 'add_comment', true),
  ('approver', 'edit_content', true),
  ('approver', 'create_content', false),
  ('approver', 'delete_content', false),
  ('approver', 'manage_approvers', false),
  ('approver', 'view_analytics', false),
  ('approver', 'manage_clients', false),
  ('approver', 'manage_team', false),
  ('approver', 'view_financeiro', false),
  ('approver', 'manage_settings', false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET enabled = EXCLUDED.enabled;

-- Garantir que todas as permissões existam para todos os roles
-- Super Admin (todas habilitadas)
INSERT INTO role_permissions (role, permission_key, enabled)
SELECT 'super_admin', perm, true
FROM (VALUES 
  ('view_content'),
  ('create_content'),
  ('approve_content'),
  ('delete_content'),
  ('edit_content'),
  ('add_comment'),
  ('manage_approvers'),
  ('view_analytics'),
  ('manage_clients'),
  ('manage_team'),
  ('view_financeiro'),
  ('manage_settings'),
  ('manage_agencies'),
  ('manage_users'),
  ('view_audit_log'),
  ('manage_subscriptions'),
  ('view_security_dashboard')
) AS perms(perm)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Agency Admin (maioria habilitadas, exceto super admin features)
INSERT INTO role_permissions (role, permission_key, enabled)
VALUES 
  ('agency_admin', 'view_content', true),
  ('agency_admin', 'create_content', true),
  ('agency_admin', 'approve_content', true),
  ('agency_admin', 'delete_content', true),
  ('agency_admin', 'edit_content', true),
  ('agency_admin', 'add_comment', true),
  ('agency_admin', 'manage_approvers', true),
  ('agency_admin', 'view_analytics', true),
  ('agency_admin', 'manage_clients', true),
  ('agency_admin', 'manage_team', true),
  ('agency_admin', 'view_financeiro', false),
  ('agency_admin', 'manage_settings', false),
  ('agency_admin', 'manage_agencies', false),
  ('agency_admin', 'manage_users', false),
  ('agency_admin', 'view_audit_log', false),
  ('agency_admin', 'manage_subscriptions', false),
  ('agency_admin', 'view_security_dashboard', true)
ON CONFLICT (role, permission_key) DO UPDATE 
SET enabled = EXCLUDED.enabled;

-- Team Member (permissões intermediárias)
INSERT INTO role_permissions (role, permission_key, enabled)
VALUES 
  ('team_member', 'view_content', true),
  ('team_member', 'create_content', true),
  ('team_member', 'approve_content', true),
  ('team_member', 'delete_content', false),
  ('team_member', 'edit_content', true),
  ('team_member', 'add_comment', true),
  ('team_member', 'manage_approvers', false),
  ('team_member', 'view_analytics', true),
  ('team_member', 'manage_clients', false),
  ('team_member', 'manage_team', false),
  ('team_member', 'view_financeiro', false),
  ('team_member', 'manage_settings', false),
  ('team_member', 'manage_agencies', false),
  ('team_member', 'manage_users', false),
  ('team_member', 'view_audit_log', false),
  ('team_member', 'manage_subscriptions', false),
  ('team_member', 'view_security_dashboard', false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET enabled = EXCLUDED.enabled;

-- Client User (apenas visualização e comentários)
INSERT INTO role_permissions (role, permission_key, enabled)
VALUES 
  ('client_user', 'view_content', true),
  ('client_user', 'create_content', false),
  ('client_user', 'approve_content', false),
  ('client_user', 'delete_content', false),
  ('client_user', 'edit_content', false),
  ('client_user', 'add_comment', true),
  ('client_user', 'manage_approvers', true),
  ('client_user', 'view_analytics', false),
  ('client_user', 'manage_clients', false),
  ('client_user', 'manage_team', false),
  ('client_user', 'view_financeiro', false),
  ('client_user', 'manage_settings', false),
  ('client_user', 'manage_agencies', false),
  ('client_user', 'manage_users', false),
  ('client_user', 'view_audit_log', false),
  ('client_user', 'manage_subscriptions', false),
  ('client_user', 'view_security_dashboard', false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET enabled = EXCLUDED.enabled;