-- PARTE 1: Tornar author_user_id opcional na tabela comments
ALTER TABLE public.comments
  ALTER COLUMN author_user_id DROP NOT NULL;

-- PARTE 2: Criar função para carregar comentários via token de aprovação
CREATE OR REPLACE FUNCTION public.get_comments_for_approval(
  p_token text,
  p_content_id uuid
)
RETURNS TABLE(
  id uuid,
  body text,
  author_user_id uuid,
  created_at timestamptz,
  is_adjustment_request boolean,
  adjustment_reason text,
  author_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_month text;
  v_start timestamptz;
  v_end timestamptz;
  v_ok boolean;
BEGIN
  -- Valida token
  SELECT t.client_id, t.month INTO v_client_id, v_month
  FROM approval_tokens t
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcula intervalo do mês
  v_start := to_timestamp(v_month || '-01', 'YYYY-MM-DD');
  v_end := v_start + interval '1 month' - interval '1 second';

  -- Verifica se o conteúdo pertence ao cliente
  SELECT EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = p_content_id
      AND c.client_id = v_client_id
      AND c.status IN ('draft','in_review')
      AND c.date >= v_start AND c.date <= v_end
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN;
  END IF;

  -- Retorna comentários com LEFT JOIN para suportar author_user_id NULL
  RETURN QUERY
  SELECT
    c.id,
    c.body,
    c.author_user_id,
    c.created_at,
    c.is_adjustment_request,
    c.adjustment_reason,
    p.name AS author_name
  FROM comments c
  LEFT JOIN profiles p ON p.id = c.author_user_id
  WHERE c.content_id = p_content_id
  ORDER BY c.created_at ASC;
END;
$$;

-- PARTE 3: Criar função helper para verificar permissões de cliente
CREATE OR REPLACE FUNCTION public.check_client_permission(
  _user_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT rp.enabled
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role::text = ur.role::text
      WHERE ur.user_id = _user_id
        AND rp.permission_key = _permission_key
      LIMIT 1
    ),
    false
  )
$$;

-- PARTE 4: Inserir novas permissões para client_user
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
  ('client_user', 'view_content_details', true),
  ('client_user', 'add_comments', true),
  ('client_user', 'view_history', true),
  ('client_user', 'reject_content', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;