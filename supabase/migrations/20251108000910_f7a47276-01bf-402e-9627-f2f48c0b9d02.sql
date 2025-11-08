-- Recriar função generate_approval_token usando gen_random_uuid ao invés de gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_approval_token(p_client_id uuid, p_month text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Gerar token único usando gen_random_uuid (nativo do PostgreSQL)
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');
  
  -- Expiração em 7 dias
  v_expires_at := now() + interval '7 days';
  
  -- Invalidar tokens antigos do mesmo cliente/mês
  UPDATE approval_tokens
  SET used_at = now()
  WHERE client_id = p_client_id
    AND month = p_month
    AND expires_at > now()
    AND used_at IS NULL;
  
  -- Criar novo token
  INSERT INTO approval_tokens (client_id, token, month, expires_at, created_by)
  VALUES (p_client_id, v_token, p_month, v_expires_at, auth.uid());
  
  RETURN v_token;
END;
$function$;