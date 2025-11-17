-- Adicionar trigger para notificar criação de novo aprovador
CREATE OR REPLACE FUNCTION notify_new_approver()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_agency_name TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Buscar nome do cliente e agência
  SELECT c.name, a.name
  INTO v_client_name, v_agency_name
  FROM clients c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.id = NEW.client_id;

  -- Buscar webhook URL do sistema
  SELECT value INTO v_webhook_url
  FROM system_settings
  WHERE key = 'internal_webhook_url';

  -- Se não encontrar, usar default
  IF v_webhook_url IS NULL THEN
    v_webhook_url := 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
  END IF;

  -- Enviar notificação via perform (assíncrono)
  PERFORM net.http_post(
    url := v_webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', 'new_approver',
      'subject', 'Novo Aprovador Cadastrado',
      'message', 'Um novo aprovador foi adicionado ao sistema',
      'approver', jsonb_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'whatsapp', NEW.whatsapp,
        'role', CASE WHEN NEW.is_primary THEN 'Primário' ELSE 'Secundário' END,
        'client_name', v_client_name,
        'agency_name', v_agency_name
      ),
      'timestamp', now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para aprovadores
DROP TRIGGER IF EXISTS trigger_notify_new_approver ON client_approvers;
CREATE TRIGGER trigger_notify_new_approver
  AFTER INSERT ON client_approvers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_approver();

-- Função para notificar nova agência
CREATE OR REPLACE FUNCTION notify_new_agency()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url TEXT;
BEGIN
  -- Buscar webhook URL do sistema
  SELECT value INTO v_webhook_url
  FROM system_settings
  WHERE key = 'internal_webhook_url';

  -- Se não encontrar, usar default
  IF v_webhook_url IS NULL THEN
    v_webhook_url := 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
  END IF;

  -- Enviar notificação
  PERFORM net.http_post(
    url := v_webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', 'new_agency',
      'subject', 'Nova Agência Cadastrada',
      'message', 'Uma nova agência foi adicionada à plataforma',
      'agency', jsonb_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'whatsapp', NEW.whatsapp,
        'plan', NEW.plan,
        'plan_type', NEW.plan_type
      ),
      'timestamp', now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para agências
DROP TRIGGER IF EXISTS trigger_notify_new_agency ON agencies;
CREATE TRIGGER trigger_notify_new_agency
  AFTER INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_agency();

-- Função para notificar novo cliente
CREATE OR REPLACE FUNCTION notify_new_client()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_name TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Buscar nome da agência
  SELECT name INTO v_agency_name
  FROM agencies
  WHERE id = NEW.agency_id;

  -- Buscar webhook URL do sistema
  SELECT value INTO v_webhook_url
  FROM system_settings
  WHERE key = 'internal_webhook_url';

  -- Se não encontrar, usar default
  IF v_webhook_url IS NULL THEN
    v_webhook_url := 'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos';
  END IF;

  -- Enviar notificação
  PERFORM net.http_post(
    url := v_webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', 'new_client',
      'subject', 'Novo Cliente Cadastrado',
      'message', 'Um novo cliente foi adicionado à plataforma',
      'client', jsonb_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'whatsapp', NEW.whatsapp,
        'agency_name', v_agency_name,
        'monthly_creatives', NEW.monthly_creatives
      ),
      'timestamp', now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para clientes
DROP TRIGGER IF EXISTS trigger_notify_new_client ON clients;
CREATE TRIGGER trigger_notify_new_client
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_client();

-- Adicionar coluna password_hash na tabela client_approvers se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_approvers' 
    AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE client_approvers ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Adicionar política DELETE para client_approvers
CREATE POLICY "Users can delete approvers of their client"
  ON public.client_approvers
  FOR DELETE
  TO authenticated
  USING (
    (
      has_role(auth.uid(), 'client_user')
      AND client_id = get_user_client_id(auth.uid())
    )
    OR
    (
      has_role(auth.uid(), 'agency_admin')
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_approvers.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
    )
    OR
    has_role(auth.uid(), 'super_admin')
  );