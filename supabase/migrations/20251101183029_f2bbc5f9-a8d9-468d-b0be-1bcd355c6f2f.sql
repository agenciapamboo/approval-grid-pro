-- Criar tabela para rastreamento de tentativas de validação de token
CREATE TABLE IF NOT EXISTS public.token_validation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  token_attempted TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_token_attempts_ip ON public.token_validation_attempts(ip_address);
CREATE INDEX idx_token_attempts_time ON public.token_validation_attempts(attempted_at);
CREATE INDEX idx_token_attempts_blocked ON public.token_validation_attempts(ip_address, blocked_until) WHERE blocked_until IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.token_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas system pode inserir
CREATE POLICY "System can insert validation attempts"
  ON public.token_validation_attempts
  FOR INSERT
  WITH CHECK (true);

-- Policy: Apenas admins podem ver tentativas
CREATE POLICY "Admins can view all attempts"
  ON public.token_validation_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'agency_admin')
    )
  );

-- Função para cleanup de tentativas antigas (mantém últimos 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_validation_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM token_validation_attempts
  WHERE attempted_at < now() - interval '30 days';
END;
$$;

-- Função para verificar se IP está bloqueado
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address TEXT)
RETURNS TABLE(
  is_blocked BOOLEAN,
  blocked_until TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_recent_failures INTEGER;
BEGIN
  -- Verificar se há bloqueio ativo
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

  RETURN QUERY SELECT 
    (v_blocked_until IS NOT NULL AND v_blocked_until > now()),
    v_blocked_until,
    v_recent_failures;
END;
$$;

-- Função para registrar tentativa de validação
CREATE OR REPLACE FUNCTION public.log_validation_attempt(
  p_ip_address TEXT,
  p_token_attempted TEXT,
  p_success BOOLEAN,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
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

    -- Bloquear após 3 tentativas falhas
    IF v_recent_failures >= 3 THEN
      -- Calcular duração do bloqueio (exponencial: 15min, 1h, 24h)
      v_block_duration := CASE
        WHEN v_recent_failures <= 5 THEN interval '15 minutes'
        WHEN v_recent_failures <= 10 THEN interval '1 hour'
        ELSE interval '24 hours'
      END;

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

-- Remover políticas públicas de conteúdo aprovado
DROP POLICY IF EXISTS "Anyone can view approved contents" ON public.contents;
DROP POLICY IF EXISTS "Anyone can view texts of approved contents" ON public.content_texts;
DROP POLICY IF EXISTS "Anyone can view media of approved contents" ON public.content_media;
DROP POLICY IF EXISTS "Anyone can view comments of approved contents" ON public.comments;

-- Criar política para visualização pública APENAS de conteúdo em review via token
-- (o frontend já filtra por status='in_review' quando há token)
CREATE POLICY "Public can view in_review contents for approval"
  ON public.contents
  FOR SELECT
  USING (status = 'in_review');

CREATE POLICY "Public can view texts of in_review contents"
  ON public.content_texts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contents
      WHERE contents.id = content_texts.content_id
      AND contents.status = 'in_review'
    )
  );

CREATE POLICY "Public can view media of in_review contents"
  ON public.content_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contents
      WHERE contents.id = content_media.content_id
      AND contents.status = 'in_review'
    )
  );

CREATE POLICY "Public can view comments of in_review contents"
  ON public.comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contents
      WHERE contents.id = comments.content_id
      AND contents.status = 'in_review'
    )
  );