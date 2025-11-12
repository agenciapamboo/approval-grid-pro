-- Criar tabela para rastrear alertas de segurança enviados
CREATE TABLE IF NOT EXISTS security_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB,
  UNIQUE(alert_type, ip_address, alert_date)
);

-- Criar índice para consultas rápidas
CREATE INDEX idx_security_alerts_ip_date ON security_alerts_sent(ip_address, notified_at DESC);

-- Habilitar RLS
ALTER TABLE security_alerts_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins podem ver todos os alertas
CREATE POLICY "Super admins can view security alerts"
  ON security_alerts_sent
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Policy: Sistema pode inserir alertas
CREATE POLICY "System can insert security alerts"
  ON security_alerts_sent
  FOR INSERT
  WITH CHECK (true);

-- Atualizar função de cleanup para incluir alertas antigos
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar códigos expirados (mais de 24h)
  DELETE FROM two_factor_codes
  WHERE expires_at < now() - INTERVAL '24 hours';
  
  -- Limpar sessões expiradas
  DELETE FROM client_sessions
  WHERE expires_at < now();
  
  -- Limpar alertas de segurança antigos (mais de 30 dias)
  DELETE FROM security_alerts_sent
  WHERE notified_at < now() - INTERVAL '30 days';
END;
$$;