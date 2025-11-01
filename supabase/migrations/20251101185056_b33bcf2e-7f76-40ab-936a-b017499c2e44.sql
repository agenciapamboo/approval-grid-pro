-- Dropar função existente antes de recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS public.is_ip_blocked(text);

-- Criar função is_ip_blocked com novo tipo de retorno
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address text)
RETURNS TABLE(is_blocked boolean, blocked_until timestamp with time zone, failed_attempts integer, is_permanent boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_recent_failures INTEGER;
  v_permanent_block BOOLEAN := false;
BEGIN
  -- Verificar se há bloqueio ativo (temporário ou permanente)
  SELECT MAX(blocked_until)
  INTO v_blocked_until
  FROM token_validation_attempts
  WHERE ip_address = p_ip_address
    AND blocked_until > now();

  -- Contar falhas recentes (última hora)
  SELECT COUNT(*)
  INTO v_recent_failures
  FROM token_validation_attempts
  WHERE ip_address = p_ip_address
    AND success = false
    AND attempted_at > now() - interval '1 hour';

  -- Verificar se é bloqueio permanente (10+ tentativas na última hora)
  IF v_recent_failures >= 10 THEN
    v_permanent_block := true;
  END IF;

  RETURN QUERY SELECT 
    (v_blocked_until IS NOT NULL AND v_blocked_until > now()),
    v_blocked_until,
    v_recent_failures,
    v_permanent_block;
END;
$$;

-- Atualizar função log_validation_attempt com bloqueios escalonados
CREATE OR REPLACE FUNCTION public.log_validation_attempt(
  p_ip_address text,
  p_token_attempted text,
  p_success boolean,
  p_user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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