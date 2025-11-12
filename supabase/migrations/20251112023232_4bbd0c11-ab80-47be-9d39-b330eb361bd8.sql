-- 1. Adicionar webhook de 2FA nas configurações do sistema
INSERT INTO system_settings (key, value, description)
VALUES (
  'two_factor_webhook_url',
  '',
  'URL do webhook N8N para envio de códigos 2FA por email/WhatsApp'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Adicionar novas permissões para funcionalidades 2FA
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
('super_admin', 'view_2fa_security_dashboard', true),
('super_admin', 'view_2fa_history', true),
('super_admin', 'manage_trusted_ips', true),
('super_admin', 'manage_2fa_webhooks', true),
('agency_admin', 'view_2fa_security_dashboard', true),
('agency_admin', 'view_2fa_history', true),
('agency_admin', 'manage_client_approvers', true),
('team_member', 'view_client_approvers', true),
('team_member', 'manage_client_approvers', false),
('client_user', 'view_client_approvers', true),
('client_user', 'add_client_approvers', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 3. Criar índices para melhorar performance nas consultas 2FA
CREATE INDEX IF NOT EXISTS idx_token_validation_attempts_ip 
ON token_validation_attempts(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_sent_ip_date 
ON security_alerts_sent(ip_address, alert_date);

CREATE INDEX IF NOT EXISTS idx_client_approvers_client 
ON client_approvers(client_id, is_active);