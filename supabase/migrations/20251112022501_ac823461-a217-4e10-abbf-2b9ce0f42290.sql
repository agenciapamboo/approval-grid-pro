-- Criar tabela de IPs confiáveis (whitelist)
CREATE TABLE IF NOT EXISTS trusted_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índice para consultas rápidas
CREATE INDEX idx_trusted_ips_active ON trusted_ips(ip_address, is_active);
CREATE INDEX idx_trusted_ips_added_by ON trusted_ips(added_by);

-- Habilitar RLS
ALTER TABLE trusted_ips ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins podem gerenciar whitelist
CREATE POLICY "Super admins can manage trusted IPs"
  ON trusted_ips
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_trusted_ips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trusted_ips_updated_at
  BEFORE UPDATE ON trusted_ips
  FOR EACH ROW
  EXECUTE FUNCTION update_trusted_ips_updated_at();

-- Atualizar função log_validation_attempt para verificar whitelist
CREATE OR REPLACE FUNCTION log_validation_attempt(p_ip_address text, p_token_attempted text, p_success boolean, p_user_agent text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures INTEGER;
  v_block_duration INTERVAL;
  v_is_trusted BOOLEAN;
BEGIN
  -- Verificar se o IP está na whitelist
  SELECT EXISTS (
    SELECT 1 FROM trusted_ips
    WHERE ip_address = p_ip_address
      AND is_active = true
  ) INTO v_is_trusted;

  -- Se o IP está na whitelist, não aplicar bloqueios
  IF v_is_trusted THEN
    -- Ainda registrar a tentativa para auditoria
    INSERT INTO token_validation_attempts (
      ip_address,
      token_attempted,
      success,
      user_agent,
      attempted_at
    ) VALUES (
      p_ip_address,
      p_token_attempted,
      p_success,
      p_user_agent,
      now()
    );
    
    -- Log que o IP está na whitelist
    IF NOT p_success THEN
      INSERT INTO activity_log (
        entity,
        action,
        metadata
      ) VALUES (
        'trusted_ip_attempt',
        'failed_but_whitelisted',
        jsonb_build_object(
          'ip_address', p_ip_address,
          'success', p_success
        )
      );
    END IF;
    
    RETURN true; -- IP confiável, permitir acesso
  END IF;

  -- Lógica original de bloqueio para IPs não confiáveis
  INSERT INTO token_validation_attempts (
    ip_address,
    token_attempted,
    success,
    user_agent,
    attempted_at
  ) VALUES (
    p_ip_address,
    p_token_attempted,
    p_success,
    p_user_agent,
    now()
  );

  -- Se falhou, verificar se deve bloquear
  IF NOT p_success THEN
    -- Contar falhas recentes (última hora)
    SELECT COUNT(*)
    INTO v_recent_failures
    FROM token_validation_attempts
    WHERE ip_address = p_ip_address
      AND success = false
      AND attempted_at > now() - interval '1 hour';

    -- Regra 3: Bloqueio permanente após 10 tentativas (só super admin pode desbloquear)
    IF v_recent_failures >= 10 THEN
      v_block_duration := interval '100 years'; -- Bloqueio "permanente"

      UPDATE token_validation_attempts
      SET blocked_until = now() + v_block_duration
      WHERE ip_address = p_ip_address
        AND attempted_at = (
          SELECT MAX(attempted_at)
          FROM token_validation_attempts
          WHERE ip_address = p_ip_address
        );

      RETURN false; -- IP bloqueado permanentemente
    
    -- Regra 2: Bloqueio temporário de 15 minutos após 5 tentativas
    ELSIF v_recent_failures >= 5 THEN
      v_block_duration := interval '15 minutes';

      UPDATE token_validation_attempts
      SET blocked_until = now() + v_block_duration
      WHERE ip_address = p_ip_address
        AND attempted_at = (
          SELECT MAX(attempted_at)
          FROM token_validation_attempts
          WHERE ip_address = p_ip_address
        );

      RETURN false; -- IP bloqueado temporariamente
    END IF;
    
    -- Regra 1: Após 3 tentativas apenas avisar (sem bloqueio)
    -- Nada a fazer aqui, a edge function irá exibir a mensagem
  END IF;

  RETURN true; -- Pode continuar
END;
$$;