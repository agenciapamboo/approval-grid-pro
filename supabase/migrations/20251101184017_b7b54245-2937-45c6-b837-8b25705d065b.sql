-- Atualizar função de bloqueio para 10 tentativas e 15 minutos
CREATE OR REPLACE FUNCTION public.log_validation_attempt(
  p_ip_address text,
  p_token_attempted text,
  p_success boolean,
  p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures INTEGER;
  v_block_duration INTERVAL;
BEGIN
  -- Inserir tentativa
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

    -- Bloquear após 10 tentativas falhas na última hora
    IF v_recent_failures >= 10 THEN
      -- Bloqueio fixo de 15 minutos
      v_block_duration := interval '15 minutes';

      -- Atualizar tentativa atual com bloqueio
      UPDATE token_validation_attempts
      SET blocked_until = now() + v_block_duration
      WHERE ip_address = p_ip_address
        AND attempted_at = (
          SELECT MAX(attempted_at)
          FROM token_validation_attempts
          WHERE ip_address = p_ip_address
        );

      RETURN false; -- IP bloqueado
    END IF;
  END IF;

  RETURN true; -- Pode continuar
END;
$$;

-- Função para desbloqueio manual de IP (apenas super admins)
CREATE OR REPLACE FUNCTION public.unblock_ip(
  p_ip_address text,
  p_unblocked_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_count INTEGER;
  v_admin_email TEXT;
BEGIN
  -- Verificar se quem está desbloqueando é super admin
  IF NOT public.has_role(p_unblocked_by, 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super administradores podem desbloquear IPs';
  END IF;

  -- Obter email do admin que está desbloqueando
  SELECT au.email INTO v_admin_email
  FROM auth.users au
  WHERE au.id = p_unblocked_by;

  -- Limpar bloqueios deste IP
  UPDATE token_validation_attempts
  SET blocked_until = NULL
  WHERE ip_address = p_ip_address
    AND blocked_until IS NOT NULL
    AND blocked_until > now();

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  -- Registrar ação no log de atividades
  INSERT INTO activity_log (
    entity,
    action,
    actor_user_id,
    metadata
  ) VALUES (
    'ip_block',
    'unblock',
    p_unblocked_by,
    jsonb_build_object(
      'ip_address', p_ip_address,
      'affected_count', v_affected_count,
      'unblocked_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'ip_address', p_ip_address,
    'affected_count', v_affected_count,
    'admin_email', v_admin_email,
    'unblocked_at', now()
  );
END;
$$;

-- Função para listar IPs bloqueados (apenas super admins)
CREATE OR REPLACE FUNCTION public.get_blocked_ips()
RETURNS TABLE(
  ip_address text,
  blocked_until timestamp with time zone,
  failed_attempts bigint,
  last_attempt timestamp with time zone,
  user_agents text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem está consultando é super admin
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super administradores podem visualizar IPs bloqueados';
  END IF;

  RETURN QUERY
  SELECT 
    t.ip_address,
    MAX(t.blocked_until) as blocked_until,
    COUNT(*) FILTER (WHERE t.success = false AND t.attempted_at > now() - interval '1 hour') as failed_attempts,
    MAX(t.attempted_at) as last_attempt,
    array_agg(DISTINCT t.user_agent) FILTER (WHERE t.user_agent IS NOT NULL) as user_agents
  FROM token_validation_attempts t
  WHERE t.blocked_until IS NOT NULL
    AND t.blocked_until > now()
  GROUP BY t.ip_address
  ORDER BY MAX(t.blocked_until) DESC;
END;
$$;