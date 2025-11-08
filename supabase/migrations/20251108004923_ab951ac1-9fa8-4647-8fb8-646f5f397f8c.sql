-- Criar função SQL segura para buscar conteúdos por token de aprovação
CREATE OR REPLACE FUNCTION public.get_contents_for_approval(p_token text)
RETURNS TABLE(
  id uuid,
  title text,
  date timestamp without time zone,
  deadline timestamp without time zone,
  type content_type,
  status content_status,
  client_id uuid,
  owner_user_id uuid,
  version integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  channels text[],
  category text,
  auto_publish boolean,
  published_at timestamp with time zone,
  publish_error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamp with time zone;
  v_end timestamp with time zone;
BEGIN
  -- Validar token e obter client_id e month
  SELECT t.client_id, t.month
  INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  -- Se token inválido, retornar vazio
  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcular intervalo de datas do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 second');

  -- Retornar conteúdos draft e in_review do mês
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.date,
    c.deadline,
    c.type,
    c.status,
    c.client_id,
    c.owner_user_id,
    c.version,
    c.created_at,
    c.updated_at,
    c.channels,
    c.category,
    c.auto_publish,
    c.published_at,
    c.publish_error
  FROM contents c
  WHERE c.client_id = v_client_id
    AND c.status IN ('draft', 'in_review')
    AND c.date >= v_start 
    AND c.date <= v_end
  ORDER BY c.date ASC;
END;
$$;

-- Conceder permissão para roles anônimas e autenticadas
GRANT EXECUTE ON FUNCTION public.get_contents_for_approval(text) TO anon, authenticated;