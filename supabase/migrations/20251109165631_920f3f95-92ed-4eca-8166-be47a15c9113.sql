-- ===== CRIAR TABELA plan_permissions =====
CREATE TABLE IF NOT EXISTS plan_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan, permission_key)
);

-- Enable RLS
ALTER TABLE plan_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins podem gerenciar
CREATE POLICY "Super admins can manage plan permissions"
ON plan_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_plan_permissions_updated_at
  BEFORE UPDATE ON plan_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();

-- ===== ADICIONAR PERMISSÃO request_creatives =====
INSERT INTO role_permissions (role, permission_key, enabled) 
VALUES 
  ('super_admin', 'request_creatives', true),
  ('agency_admin', 'request_creatives', true),
  ('client_user', 'request_creatives', true),
  ('team_member', 'request_creatives', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ===== POPULAR plan_permissions COM VALORES INICIAIS =====
-- Creator: apenas visualização e aprovação básica
INSERT INTO plan_permissions (plan, permission_key, enabled) VALUES
  ('creator', 'view_content', true),
  ('creator', 'approve_content', true),
  ('creator', 'request_changes', true),
  ('creator', 'request_creatives', false)
ON CONFLICT (plan, permission_key) DO NOTHING;

-- Eugencia: + solicitar criativos
INSERT INTO plan_permissions (plan, permission_key, enabled) VALUES
  ('eugencia', 'view_content', true),
  ('eugencia', 'approve_content', true),
  ('eugencia', 'request_changes', true),
  ('eugencia', 'request_creatives', true)
ON CONFLICT (plan, permission_key) DO NOTHING;

-- Social Midia: + criar conteúdo
INSERT INTO plan_permissions (plan, permission_key, enabled) VALUES
  ('socialmidia', 'view_content', true),
  ('socialmidia', 'approve_content', true),
  ('socialmidia', 'request_changes', true),
  ('socialmidia', 'request_creatives', true),
  ('socialmidia', 'create_content', true)
ON CONFLICT (plan, permission_key) DO NOTHING;

-- Full Service: todas as permissões exceto gestão de sistema
INSERT INTO plan_permissions (plan, permission_key, enabled) VALUES
  ('fullservice', 'view_content', true),
  ('fullservice', 'approve_content', true),
  ('fullservice', 'request_changes', true),
  ('fullservice', 'request_creatives', true),
  ('fullservice', 'create_content', true),
  ('fullservice', 'delete_content', true),
  ('fullservice', 'manage_clients', false)
ON CONFLICT (plan, permission_key) DO NOTHING;

-- Unlimited: todas as permissões
INSERT INTO plan_permissions (plan, permission_key, enabled) VALUES
  ('unlimited', 'view_content', true),
  ('unlimited', 'approve_content', true),
  ('unlimited', 'request_changes', true),
  ('unlimited', 'request_creatives', true),
  ('unlimited', 'create_content', true),
  ('unlimited', 'delete_content', true),
  ('unlimited', 'manage_clients', true),
  ('unlimited', 'manage_users', true),
  ('unlimited', 'view_financial', true)
ON CONFLICT (plan, permission_key) DO NOTHING;