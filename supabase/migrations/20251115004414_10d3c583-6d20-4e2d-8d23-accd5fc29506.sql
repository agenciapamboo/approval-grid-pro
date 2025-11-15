-- Migration: Remove 2FA and Approval Token System (Keep IP Management)
-- Mantém: trusted_ips, security_alerts_sent, login_validation_attempts (renamed)

-- 1. Dropar tabelas relacionadas a 2FA e tokens de aprovação
DROP TABLE IF EXISTS public.two_factor_codes CASCADE;
DROP TABLE IF EXISTS public.client_sessions CASCADE;
DROP TABLE IF EXISTS public.approval_tokens CASCADE;
DROP TABLE IF EXISTS public.approval_tokens_backup CASCADE;

-- 2. Renomear tabela de validação de tokens para login attempts
ALTER TABLE IF EXISTS public.token_validation_attempts 
  RENAME TO login_validation_attempts;

-- 3. Atualizar comentários da tabela renomeada
COMMENT ON TABLE public.login_validation_attempts IS 'Registro de tentativas de login para detecção de brute force e bloqueio de IPs';

-- 4. Remover funções específicas de 2FA (manter funções de IP)
DROP FUNCTION IF EXISTS public.cleanup_expired_2fa_data() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_whatsapp(text) CASCADE;
DROP FUNCTION IF EXISTS public.find_approver_by_identifier(text) CASCADE;

-- 5. Recriar função log_validation_attempt como log_login_attempt
DROP FUNCTION IF EXISTS public.log_validation_attempt(text, text, boolean, text) CASCADE;

CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_ip_address text,
  p_user_identifier text,
  p_success boolean,
  p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    INSERT INTO login_validation_attempts (
      ip_address,
      token_attempted,
      success,
      user_agent,
      attempted_at
    ) VALUES (
      p_ip_address,
      p_user_identifier,
      p_success,
      p_user_agent,
      now()
    );
    
    IF NOT p_success THEN
      INSERT INTO activity_log (
        entity,
        action,
        metadata
      ) VALUES (
        'trusted_ip_login',
        'failed_but_whitelisted',
        jsonb_build_object(
          'ip_address', p_ip_address,
          'success', p_success
        )
      );
    END IF;
    
    RETURN true;
  END IF;

  -- Registrar tentativa
  INSERT INTO login_validation_attempts (
    ip_address,
    token_attempted,
    success,
    user_agent,
    attempted_at
  ) VALUES (
    p_ip_address,
    p_user_identifier,
    p_success,
    p_user_agent,
    now()
  );

  -- Se falhou, verificar se deve bloquear
  IF NOT p_success THEN
    SELECT COUNT(*)
    INTO v_recent_failures
    FROM login_validation_attempts
    WHERE ip_address = p_ip_address
      AND success = false
      AND attempted_at > now() - interval '1 hour';

    -- Bloqueio permanente após 10 tentativas
    IF v_recent_failures >= 10 THEN
      v_block_duration := interval '100 years';

      UPDATE login_validation_attempts
      SET blocked_until = now() + v_block_duration
      WHERE ip_address = p_ip_address
        AND attempted_at = (
          SELECT MAX(attempted_at)
          FROM login_validation_attempts
          WHERE ip_address = p_ip_address
        );

      RETURN false;
    
    -- Bloqueio temporário de 15 minutos após 5 tentativas
    ELSIF v_recent_failures >= 5 THEN
      v_block_duration := interval '15 minutes';

      UPDATE login_validation_attempts
      SET blocked_until = now() + v_block_duration
      WHERE ip_address = p_ip_address
        AND attempted_at = (
          SELECT MAX(attempted_at)
          FROM login_validation_attempts
          WHERE ip_address = p_ip_address
        );

      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$function$;

-- 6. Atualizar função is_ip_blocked para usar nova tabela
DROP FUNCTION IF EXISTS public.is_ip_blocked(text) CASCADE;

CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address text)
RETURNS TABLE(
  is_blocked boolean, 
  blocked_until timestamp with time zone, 
  failed_attempts integer, 
  is_permanent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_recent_failures INTEGER;
  v_permanent_block BOOLEAN := false;
BEGIN
  -- Verificar se há bloqueio ativo
  SELECT MAX(attempts.blocked_until)
  INTO v_blocked_until
  FROM login_validation_attempts AS attempts
  WHERE attempts.ip_address = p_ip_address
    AND attempts.blocked_until > now();

  -- Contar falhas recentes (última hora)
  SELECT COUNT(*)::integer
  INTO v_recent_failures
  FROM login_validation_attempts AS attempts
  WHERE attempts.ip_address = p_ip_address
    AND attempts.success = false
    AND attempts.attempted_at > now() - interval '1 hour';

  -- Verificar se é bloqueio permanente
  IF v_recent_failures >= 10 THEN
    v_permanent_block := true;
  END IF;

  RETURN QUERY SELECT 
    (v_blocked_until IS NOT NULL AND v_blocked_until > now())::boolean AS is_blocked,
    v_blocked_until AS blocked_until,
    v_recent_failures AS failed_attempts,
    v_permanent_block AS is_permanent;
END;
$function$;

-- 7. Atualizar função unblock_ip para usar nova tabela
DROP FUNCTION IF EXISTS public.unblock_ip(text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.unblock_ip(p_ip_address text, p_unblocked_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_affected_count INTEGER;
  v_admin_email TEXT;
BEGIN
  IF NOT public.has_role(p_unblocked_by, 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super administradores podem desbloquear IPs';
  END IF;

  SELECT au.email INTO v_admin_email
  FROM auth.users au
  WHERE au.id = p_unblocked_by;

  UPDATE login_validation_attempts
  SET blocked_until = NULL
  WHERE ip_address = p_ip_address
    AND blocked_until IS NOT NULL
    AND blocked_until > now();

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

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
$function$;

-- 8. Atualizar função get_blocked_ips para usar nova tabela
DROP FUNCTION IF EXISTS public.get_blocked_ips() CASCADE;

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
SET search_path TO 'public'
AS $function$
BEGIN
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
  FROM login_validation_attempts t
  WHERE t.blocked_until IS NOT NULL
    AND t.blocked_until > now()
  GROUP BY t.ip_address
  ORDER BY MAX(t.blocked_until) DESC;
END;
$function$;

-- 9. Atualizar função de limpeza para usar nova tabela
DROP FUNCTION IF EXISTS public.cleanup_old_validation_attempts() CASCADE;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM login_validation_attempts
  WHERE attempted_at < now() - interval '30 days';
END;
$function$;

-- 10. Remover configurações de sistema relacionadas a 2FA
DELETE FROM public.system_settings 
WHERE key IN ('two_factor_webhook_url', '2fa_enabled');