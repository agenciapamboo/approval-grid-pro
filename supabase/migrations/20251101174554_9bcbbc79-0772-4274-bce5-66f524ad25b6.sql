-- Tabela para tokens de aprovação
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  month TEXT NOT NULL, -- formato YYYY-MM
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_approval_tokens_token ON public.approval_tokens(token);
CREATE INDEX idx_approval_tokens_client_month ON public.approval_tokens(client_id, month);
CREATE INDEX idx_approval_tokens_expires_at ON public.approval_tokens(expires_at);

-- RLS para approval_tokens
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode validar tokens (necessário para acesso público)
CREATE POLICY "Anyone can validate tokens"
  ON public.approval_tokens
  FOR SELECT
  USING (expires_at > now() AND used_at IS NULL);

-- Apenas admins da agência podem criar tokens
CREATE POLICY "Agency admins can create tokens"
  ON public.approval_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN profiles p ON p.agency_id = c.agency_id
      WHERE c.id = approval_tokens.client_id
        AND p.id = auth.uid()
        AND has_role(auth.uid(), 'agency_admin'::app_role)
    )
  );

-- Função para gerar token seguro
CREATE OR REPLACE FUNCTION public.generate_approval_token(
  p_client_id UUID,
  p_month TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Gerar token único (base64 do uuid)
  v_token := encode(gen_random_bytes(32), 'base64');
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
$$;

-- Função para validar token e retornar client_id
CREATE OR REPLACE FUNCTION public.validate_approval_token(p_token TEXT)
RETURNS TABLE(
  client_id UUID,
  month TEXT,
  client_slug TEXT,
  client_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    t.month,
    c.slug,
    c.name
  FROM approval_tokens t
  JOIN clients c ON c.id = t.client_id
  WHERE t.token = p_token
    AND t.expires_at > now()
    AND t.used_at IS NULL
  LIMIT 1;
END;
$$;

-- Comentários
COMMENT ON TABLE public.approval_tokens IS 'Tokens de aprovação temporários para acesso público a conteúdos';
COMMENT ON FUNCTION public.generate_approval_token IS 'Gera token de aprovação com validade de 7 dias';
COMMENT ON FUNCTION public.validate_approval_token IS 'Valida token e retorna dados do cliente';