-- Função para obter legenda via token de aprovação
CREATE OR REPLACE FUNCTION public.get_content_caption_for_approval(p_token text, p_content_id uuid, p_version integer)
RETURNS TABLE(caption text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_content_exists boolean;
  v_version integer;
BEGIN
  -- Validar token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcular intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Verificar se o conteúdo pertence ao cliente e está no mês correto
  SELECT EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = p_content_id
      AND c.client_id = v_client_id
      AND c.status IN ('draft','in_review')
      AND c.date >= v_start AND c.date <= v_end
  ) INTO v_content_exists;

  IF NOT v_content_exists THEN
    RETURN;
  END IF;

  -- Usar versão fornecida ou pegar a mais recente
  SELECT COALESCE(p_version, (SELECT MAX(version) FROM content_texts WHERE content_id = p_content_id))
  INTO v_version;

  -- Retornar legenda
  RETURN QUERY
  SELECT ct.caption
  FROM content_texts ct
  WHERE ct.content_id = p_content_id AND ct.version = v_version
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_content_caption_for_approval(text, uuid, integer) TO anon, authenticated;

-- Função para adicionar comentário via token de aprovação
CREATE OR REPLACE FUNCTION public.add_comment_for_approval(p_token text, p_content_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_content_version integer;
BEGIN
  -- Validar token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  -- Calcular intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Verificar se o conteúdo existe e pertence ao cliente
  SELECT c.version INTO v_content_version
  FROM contents c
  WHERE c.id = p_content_id
    AND c.client_id = v_client_id
    AND c.status IN ('draft','in_review')
    AND c.date >= v_start AND c.date <= v_end
  LIMIT 1;

  IF v_content_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conteúdo não encontrado');
  END IF;

  -- Inserir comentário (sem author_user_id, pois é público)
  INSERT INTO comments (content_id, version, author_user_id, body, is_adjustment_request)
  VALUES (p_content_id, v_content_version, NULL, p_body, false);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_comment_for_approval(text, uuid, text) TO anon, authenticated;

-- Função para salvar legenda via token de aprovação
CREATE OR REPLACE FUNCTION public.save_caption_for_approval(p_token text, p_content_id uuid, p_caption text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_current_version integer;
  v_new_version integer;
BEGIN
  -- Validar token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  -- Calcular intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Verificar se o conteúdo existe e obter versão atual
  SELECT c.version INTO v_current_version
  FROM contents c
  WHERE c.id = p_content_id
    AND c.client_id = v_client_id
    AND c.status IN ('draft','in_review')
    AND c.date >= v_start AND c.date <= v_end
  LIMIT 1;

  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conteúdo não encontrado');
  END IF;

  -- Nova versão
  v_new_version := v_current_version + 1;

  -- Inserir nova versão da legenda
  INSERT INTO content_texts (content_id, version, caption)
  VALUES (p_content_id, v_new_version, p_caption);

  -- Atualizar versão do conteúdo
  UPDATE contents SET version = v_new_version WHERE id = p_content_id;

  RETURN jsonb_build_object('success', true, 'version', v_new_version);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_caption_for_approval(text, uuid, text) TO anon, authenticated;

-- Função para aprovar conteúdo via token
CREATE OR REPLACE FUNCTION public.approve_content_for_approval(p_token text, p_content_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_content_version integer;
BEGIN
  -- Validar token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  -- Calcular intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Verificar e obter versão do conteúdo
  SELECT c.version INTO v_content_version
  FROM contents c
  WHERE c.id = p_content_id
    AND c.client_id = v_client_id
    AND c.status IN ('draft','in_review')
    AND c.date >= v_start AND c.date <= v_end
  LIMIT 1;

  IF v_content_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conteúdo não encontrado');
  END IF;

  -- Atualizar status para approved
  UPDATE contents SET status = 'approved' WHERE id = p_content_id;

  -- Adicionar comentário de aprovação
  INSERT INTO comments (content_id, version, author_user_id, body, is_adjustment_request)
  VALUES (p_content_id, v_content_version, NULL, 'Cliente: Aprovado em ' || to_char(now(), 'DD/MM/YYYY HH24:MI'), false);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_content_for_approval(text, uuid) TO anon, authenticated;

-- Função para reprovar conteúdo via token
CREATE OR REPLACE FUNCTION public.reject_content_for_approval(p_token text, p_content_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_content_version integer;
BEGIN
  -- Validar token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido ou expirado');
  END IF;

  -- Calcular intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + INTERVAL '1 month' - INTERVAL '1 second';

  -- Verificar e obter versão do conteúdo
  SELECT c.version INTO v_content_version
  FROM contents c
  WHERE c.id = p_content_id
    AND c.client_id = v_client_id
    AND c.status IN ('draft','in_review')
    AND c.date >= v_start AND c.date <= v_end
  LIMIT 1;

  IF v_content_version IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conteúdo não encontrado');
  END IF;

  -- Atualizar status para changes_requested
  UPDATE contents SET status = 'changes_requested' WHERE id = p_content_id;

  -- Adicionar comentário de reprovação
  INSERT INTO comments (content_id, version, author_user_id, body, is_adjustment_request)
  VALUES (p_content_id, v_content_version, NULL, 'Reprovado: ' || p_reason, true);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_content_for_approval(text, uuid, text) TO anon, authenticated;