-- Adicionar novas permissões relacionadas ao sistema de tickets

-- Permissões para Super Admin
INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES 
  ('super_admin', 'manage_all_tickets', true),
  ('super_admin', 'view_ticket_analytics', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;

-- Permissões para Agency Admin
INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES 
  ('agency_admin', 'manage_client_tickets', true),
  ('agency_admin', 'create_support_tickets', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;

-- Permissões para Client User
INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES 
  ('client_user', 'create_agency_tickets', true),
  ('client_user', 'view_own_tickets', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;

-- Permissões para Team Member
INSERT INTO public.role_permissions (role, permission_key, enabled)
VALUES 
  ('team_member', 'create_support_tickets', true),
  ('team_member', 'view_own_tickets', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = true;