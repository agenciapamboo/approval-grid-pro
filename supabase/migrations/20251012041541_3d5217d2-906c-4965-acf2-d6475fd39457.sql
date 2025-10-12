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