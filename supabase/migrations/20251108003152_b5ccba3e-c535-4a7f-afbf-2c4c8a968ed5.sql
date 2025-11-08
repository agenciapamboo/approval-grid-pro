-- Drop e recriar função is_ip_blocked para resolver ambiguidade definitivamente
DROP FUNCTION IF EXISTS public.is_ip_blocked(text);

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
  -- Verificar se há bloqueio ativo usando alias explícito
  SELECT MAX(attempts.blocked_until)
  INTO v_blocked_until
  FROM token_validation_attempts AS attempts
  WHERE attempts.ip_address = p_ip_address
    AND attempts.blocked_until > now();

  -- Contar falhas recentes (última hora) usando alias explícito
  SELECT COUNT(*)::integer
  INTO v_recent_failures
  FROM token_validation_attempts AS attempts
  WHERE attempts.ip_address = p_ip_address
    AND attempts.success = false
    AND attempts.attempted_at > now() - interval '1 hour';

  -- Verificar se é bloqueio permanente (10+ tentativas na última hora)
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