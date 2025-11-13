-- Adicionar permissões granulares de visualização de conteúdo para todos os roles
-- Permissões de visualização de blocos de conteúdo
INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_media_blocks', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_action_buttons', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN false
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_history_box', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_comment_box', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Permissões de filtros
INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'filter_by_status', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN false
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'filter_by_month', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN false
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_all_statuses', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Permissões de ações de conteúdo
INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'request_adjustment', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN false
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'reject_content', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN false
    WHEN 'client_user' THEN false
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled)
SELECT role::app_role, 'view_content_details', 
  CASE role 
    WHEN 'super_admin' THEN true
    WHEN 'agency_admin' THEN true
    WHEN 'team_member' THEN true
    WHEN 'client_user' THEN true
    WHEN 'approver' THEN true
  END
FROM (VALUES ('super_admin'), ('agency_admin'), ('team_member'), ('client_user'), ('approver')) AS roles(role)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;