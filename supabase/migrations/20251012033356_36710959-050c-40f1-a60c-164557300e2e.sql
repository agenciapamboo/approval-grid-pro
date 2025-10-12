-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID,
  channel TEXT CHECK (channel IN ('email', 'whatsapp', 'webhook')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_content_id ON notifications(content_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_event ON notifications(event);

-- Criar tabela de preferências de usuário
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_whatsapp BOOLEAN DEFAULT FALSE,
  notify_webhook BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies para notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          (has_role(auth.uid(), 'super_admin'::app_role)) OR
          (has_role(auth.uid(), 'agency_admin'::app_role) AND p.agency_id = notifications.agency_id) OR
          (has_role(auth.uid(), 'client_user'::app_role) AND p.client_id = notifications.client_id)
        )
    )
  );

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update notifications"
  ON notifications FOR UPDATE
  USING (true);

-- RLS Policies para user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Função para enviar notificação
CREATE OR REPLACE FUNCTION send_notification(
  p_event TEXT,
  p_content_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_user_prefs RECORD;
  v_channels TEXT[] := ARRAY[]::TEXT[];
  v_channel TEXT;
BEGIN
  -- Buscar preferências do usuário se user_id foi fornecido
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_user_prefs FROM user_preferences WHERE user_id = p_user_id;
    
    -- Determinar canais baseado nas preferências
    IF v_user_prefs IS NOT NULL THEN
      IF v_user_prefs.notify_email THEN
        v_channels := array_append(v_channels, 'email');
      END IF;
      IF v_user_prefs.notify_whatsapp THEN
        v_channels := array_append(v_channels, 'whatsapp');
      END IF;
      IF v_user_prefs.notify_webhook THEN
        v_channels := array_append(v_channels, 'webhook');
      END IF;
    ELSE
      -- Preferências padrão se não configuradas
      v_channels := ARRAY['email', 'webhook'];
    END IF;
  ELSE
    -- Se não há user_id, enviar para todos os canais
    v_channels := ARRAY['email', 'whatsapp', 'webhook'];
  END IF;

  -- Criar notificações para cada canal
  FOREACH v_channel IN ARRAY v_channels
  LOOP
    INSERT INTO notifications (
      event,
      content_id,
      client_id,
      agency_id,
      user_id,
      channel,
      payload,
      status
    ) VALUES (
      p_event,
      p_content_id,
      p_client_id,
      p_agency_id,
      p_user_id,
      v_channel,
      p_payload,
      'pending'
    ) RETURNING id INTO v_notification_id;
  END LOOP;

  RETURN v_notification_id;
END;
$$;