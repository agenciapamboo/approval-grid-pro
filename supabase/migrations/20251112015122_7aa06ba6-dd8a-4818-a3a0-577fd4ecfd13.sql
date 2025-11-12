-- =====================================================
-- FASE 1: Sistema 2FA com Múltiplos Aprovadores
-- =====================================================

-- 1. Criar tabela de aprovadores
CREATE TABLE IF NOT EXISTS public.client_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Validações
  CONSTRAINT at_least_one_contact CHECK (email IS NOT NULL OR whatsapp IS NOT NULL),
  CONSTRAINT only_one_primary_per_client UNIQUE (client_id, is_primary) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Índices para performance
CREATE INDEX idx_client_approvers_client_id ON public.client_approvers(client_id);
CREATE INDEX idx_client_approvers_email ON public.client_approvers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_client_approvers_whatsapp ON public.client_approvers(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX idx_client_approvers_active ON public.client_approvers(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_client_approvers_updated_at
  BEFORE UPDATE ON public.client_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Criar tabela de códigos 2FA
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approver_id UUID NOT NULL REFERENCES public.client_approvers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  identifier TEXT NOT NULL, -- email ou whatsapp usado para solicitar
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'whatsapp')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_two_factor_codes_code ON public.two_factor_codes(code);
CREATE INDEX idx_two_factor_codes_approver ON public.two_factor_codes(approver_id);
CREATE INDEX idx_two_factor_codes_expires ON public.two_factor_codes(expires_at);

-- 3. Criar tabela de sessões de clientes
CREATE TABLE IF NOT EXISTS public.client_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approver_id UUID NOT NULL REFERENCES public.client_approvers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_sessions_token ON public.client_sessions(session_token);
CREATE INDEX idx_client_sessions_approver ON public.client_sessions(approver_id);
CREATE INDEX idx_client_sessions_expires ON public.client_sessions(expires_at);

-- 4. RLS Policies para client_approvers

ALTER TABLE public.client_approvers ENABLE ROW LEVEL SECURITY;

-- Agências podem gerenciar aprovadores de seus clientes
CREATE POLICY "Agency admins can manage their clients approvers"
  ON public.client_approvers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = client_approvers.client_id
        AND p.id = auth.uid()
        AND has_role(auth.uid(), 'agency_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE c.id = client_approvers.client_id
        AND p.id = auth.uid()
        AND has_role(auth.uid(), 'agency_admin')
    )
  );

-- Clientes podem gerenciar seus próprios aprovadores
CREATE POLICY "Clients can manage their own approvers"
  ON public.client_approvers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.client_id = client_approvers.client_id
        AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.client_id = client_approvers.client_id
        AND p.id = auth.uid()
    )
  );

-- Super admins podem visualizar tudo
CREATE POLICY "Super admins can view all approvers"
  ON public.client_approvers
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- 5. RLS Policies para two_factor_codes

ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Sistema pode inserir códigos (via edge function)
CREATE POLICY "System can insert 2FA codes"
  ON public.two_factor_codes
  FOR INSERT
  WITH CHECK (true);

-- Sistema pode ler códigos para validação
CREATE POLICY "System can read 2FA codes"
  ON public.two_factor_codes
  FOR SELECT
  USING (true);

-- Sistema pode atualizar códigos (marcar como usado)
CREATE POLICY "System can update 2FA codes"
  ON public.two_factor_codes
  FOR UPDATE
  USING (true);

-- 6. RLS Policies para client_sessions

ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Sistema pode gerenciar sessões
CREATE POLICY "System can manage client sessions"
  ON public.client_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Inserir configuração do webhook 2FA

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'two_factor_webhook_url',
  'https://webhook.pamboocriativos.com.br/webhook/2310d761-5fdd-4d0d-8014-autenticacao2f',
  'URL do webhook N8N para envio de códigos 2FA via email e WhatsApp'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- 8. Migrar clientes existentes para aprovadores primários

INSERT INTO public.client_approvers (
  client_id,
  name,
  email,
  whatsapp,
  is_primary,
  is_active,
  created_by
)
SELECT 
  c.id AS client_id,
  c.name AS name,
  c.email AS email,
  c.whatsapp AS whatsapp,
  true AS is_primary,
  true AS is_active,
  c.responsible_user_id AS created_by
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_approvers ca
  WHERE ca.client_id = c.id AND ca.is_primary = true
)
AND (c.email IS NOT NULL OR c.whatsapp IS NOT NULL);

-- 9. Função auxiliar para normalizar WhatsApp

CREATE OR REPLACE FUNCTION public.normalize_whatsapp(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove todos os caracteres não numéricos
  RETURN regexp_replace(phone, '[^0-9]', '', 'g');
END;
$$;

-- 10. Função para buscar aprovador por identificador

CREATE OR REPLACE FUNCTION public.find_approver_by_identifier(
  p_identifier TEXT,
  OUT approver_id UUID,
  OUT client_id UUID,
  OUT approver_name TEXT,
  OUT identifier_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_identifier TEXT;
BEGIN
  -- Normalizar identificador (remover espaços, converter para lowercase)
  v_normalized_identifier := lower(trim(p_identifier));
  
  -- Tentar encontrar por email
  SELECT ca.id, ca.client_id, ca.name, 'email'
  INTO approver_id, client_id, approver_name, identifier_type
  FROM client_approvers ca
  WHERE lower(trim(ca.email)) = v_normalized_identifier
    AND ca.is_active = true
  LIMIT 1;
  
  -- Se não encontrou, tentar por WhatsApp normalizado
  IF approver_id IS NULL THEN
    v_normalized_identifier := normalize_whatsapp(p_identifier);
    
    SELECT ca.id, ca.client_id, ca.name, 'whatsapp'
    INTO approver_id, client_id, approver_name, identifier_type
    FROM client_approvers ca
    WHERE normalize_whatsapp(ca.whatsapp) = v_normalized_identifier
      AND ca.is_active = true
    LIMIT 1;
  END IF;
END;
$$;

-- 11. Função para cleanup de códigos e sessões expirados

CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar códigos expirados (mais de 24h)
  DELETE FROM two_factor_codes
  WHERE expires_at < now() - INTERVAL '24 hours';
  
  -- Limpar sessões expiradas
  DELETE FROM client_sessions
  WHERE expires_at < now();
END;
$$;