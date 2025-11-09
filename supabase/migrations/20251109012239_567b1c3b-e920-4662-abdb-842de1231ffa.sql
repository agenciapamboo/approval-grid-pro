-- Create role_permissions table for editable permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Insert default permissions
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Super Admin (todas habilitadas)
  ('super_admin', 'access_dashboard', true),
  ('super_admin', 'manage_clients', true),
  ('super_admin', 'manage_users', true),
  ('super_admin', 'view_financial', true),
  ('super_admin', 'edit_plans', true),
  ('super_admin', 'manage_roles', true),
  ('super_admin', 'create_content', true),
  ('super_admin', 'approve_content', true),
  ('super_admin', 'delete_content', true),
  
  -- Agency Admin
  ('agency_admin', 'access_dashboard', true),
  ('agency_admin', 'manage_clients', true),
  ('agency_admin', 'create_content', true),
  ('agency_admin', 'approve_content', true),
  ('agency_admin', 'delete_content', true),
  ('agency_admin', 'view_financial', false),
  ('agency_admin', 'edit_plans', false),
  ('agency_admin', 'manage_users', true),
  ('agency_admin', 'manage_roles', false),
  
  -- Client User
  ('client_user', 'access_dashboard', true),
  ('client_user', 'view_content', true),
  ('client_user', 'approve_content', true),
  ('client_user', 'request_changes', true),
  ('client_user', 'create_content', false),
  ('client_user', 'delete_content', false),
  ('client_user', 'manage_clients', false),
  ('client_user', 'view_financial', false),
  ('client_user', 'edit_plans', false),
  
  -- Team Member
  ('team_member', 'access_dashboard', true),
  ('team_member', 'view_content', true),
  ('team_member', 'create_content', true),
  ('team_member', 'approve_content', false),
  ('team_member', 'delete_content', false),
  ('team_member', 'manage_clients', false),
  ('team_member', 'view_financial', false),
  ('team_member', 'edit_plans', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION update_role_permissions_updated_at();