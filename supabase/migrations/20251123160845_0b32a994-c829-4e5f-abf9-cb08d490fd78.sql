-- =========================================
-- MIGRAÇÃO: Sistema de Webhook Global para Agências
-- Objetivo: Centralizar webhooks de agências e automatizar eventos
-- =========================================

-- 1. RLS POLICIES PARA SYSTEM_SETTINGS
-- =========================================

-- Política para SELECT (todos os autenticados podem ler)
CREATE POLICY "Allow authenticated users to read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para INSERT (apenas super_admins)
CREATE POLICY "Allow super admins to insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Política para UPDATE (apenas super_admins)
CREATE POLICY "Allow super admins to update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 2. INSERIR REGISTRO DO WEBHOOK DE AGÊNCIAS
-- =========================================

INSERT INTO public.system_settings (key, value, description)
VALUES (
  'agency_notifications_webhook_url',
  '',
  'URL do webhook N8N para notificações de agências (status de criativos, solicitações de ajuste e criativo)'
)
ON CONFLICT (key) DO NOTHING;

-- 3. FUNÇÃO PARA ENFILEIRAR EVENTOS DE WEBHOOK
-- =========================================

CREATE OR REPLACE FUNCTION public.queue_agency_webhook_event(
  p_event TEXT,
  p_content_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT;
  v_event_id UUID;
BEGIN
  -- Buscar URL do webhook global
  SELECT value INTO v_webhook_url
  FROM public.system_settings
  WHERE key = 'agency_notifications_webhook_url';

  -- Se não houver webhook configurado, retornar NULL
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NULL;
  END IF;

  -- Inserir evento na fila
  INSERT INTO public.webhook_events (
    client_id,
    event,
    payload,
    status
  ) VALUES (
    p_client_id,
    p_event,
    p_payload,
    'queued'
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 4. TRIGGERS PARA EVENTOS DE CONTEÚDO
-- =========================================

-- 4.1 content.ready_for_approval (quando enviado para revisão)
CREATE OR REPLACE FUNCTION public.trigger_content_ready_for_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_data JSONB;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'status', c.status,
    'date', c.date,
    'deadline', c.deadline,
    'channels', c.channels,
    'category', c.category
  ) INTO v_content_data
  FROM contents c
  WHERE c.id = NEW.id;

  SELECT jsonb_build_object(
    'id', cl.id,
    'name', cl.name,
    'slug', cl.slug
  ) INTO v_client_data
  FROM clients cl
  WHERE cl.id = NEW.client_id;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug
  ) INTO v_agency_data
  FROM agencies a
  WHERE a.id = NEW.agency_id;

  PERFORM public.queue_agency_webhook_event(
    'content.ready_for_approval',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_ready_for_approval
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  WHEN (NEW.status = 'in_review' AND OLD.status != 'in_review')
  EXECUTE FUNCTION public.trigger_content_ready_for_approval();

-- 4.2 content.approved
CREATE OR REPLACE FUNCTION public.trigger_content_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_data JSONB;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'status', c.status,
    'date', c.date,
    'channels', c.channels
  ) INTO v_content_data
  FROM contents c
  WHERE c.id = NEW.id;

  SELECT jsonb_build_object(
    'id', cl.id,
    'name', cl.name,
    'slug', cl.slug
  ) INTO v_client_data
  FROM clients cl
  WHERE cl.id = NEW.client_id;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug
  ) INTO v_agency_data
  FROM agencies a
  WHERE a.id = NEW.agency_id;

  PERFORM public.queue_agency_webhook_event(
    'content.approved',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_approved
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION public.trigger_content_approved();

-- 4.3 content.changes_requested
CREATE OR REPLACE FUNCTION public.trigger_content_changes_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_data JSONB;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'status', c.status,
    'date', c.date,
    'channels', c.channels
  ) INTO v_content_data
  FROM contents c
  WHERE c.id = NEW.id;

  SELECT jsonb_build_object(
    'id', cl.id,
    'name', cl.name,
    'slug', cl.slug
  ) INTO v_client_data
  FROM clients cl
  WHERE cl.id = NEW.client_id;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug
  ) INTO v_agency_data
  FROM agencies a
  WHERE a.id = NEW.agency_id;

  PERFORM public.queue_agency_webhook_event(
    'content.changes_requested',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_changes_requested
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  WHEN (NEW.status = 'changes_requested' AND OLD.status != 'changes_requested')
  EXECUTE FUNCTION public.trigger_content_changes_requested();

-- 4.4 content.adjustment_completed
CREATE OR REPLACE FUNCTION public.trigger_content_adjustment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_data JSONB;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'type', c.type,
    'status', c.status,
    'date', c.date,
    'channels', c.channels
  ) INTO v_content_data
  FROM contents c
  WHERE c.id = NEW.id;

  SELECT jsonb_build_object(
    'id', cl.id,
    'name', cl.name,
    'slug', cl.slug
  ) INTO v_client_data
  FROM clients cl
  WHERE cl.id = NEW.client_id;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug
  ) INTO v_agency_data
  FROM agencies a
  WHERE a.id = NEW.agency_id;

  PERFORM public.queue_agency_webhook_event(
    'content.adjustment_completed',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_adjustment_completed
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  WHEN (NEW.status = 'in_review' AND OLD.status = 'changes_requested')
  EXECUTE FUNCTION public.trigger_content_adjustment_completed();

-- 4.5 content.auto_approved (quando auto-aprovado por deadline)
CREATE OR REPLACE FUNCTION public.trigger_content_auto_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_data JSONB;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  IF NEW.status = 'approved' 
     AND OLD.status = 'in_review' 
     AND NEW.deadline IS NOT NULL 
     AND NEW.deadline < NOW() THEN
    
    SELECT jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'type', c.type,
      'status', c.status,
      'date', c.date,
      'deadline', c.deadline,
      'channels', c.channels,
      'auto_approved_reason', 'Prazo de aprovação vencido'
    ) INTO v_content_data
    FROM contents c
    WHERE c.id = NEW.id;

    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = NEW.client_id;

    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = NEW.agency_id;

    PERFORM public.queue_agency_webhook_event(
      'content.auto_approved',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'content', v_content_data,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_auto_approved
  AFTER UPDATE ON public.contents
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'in_review')
  EXECUTE FUNCTION public.trigger_content_auto_approved();

-- 5. TRIGGERS PARA EVENTOS DE SOLICITAÇÕES DE CRIATIVO
-- =========================================

-- 5.1 creative_request.created (novojob)
CREATE OR REPLACE FUNCTION public.trigger_creative_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', cl.id,
    'name', cl.name,
    'slug', cl.slug
  ) INTO v_client_data
  FROM clients cl
  WHERE cl.id = NEW.client_id;

  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug
  ) INTO v_agency_data
  FROM agencies a
  WHERE a.id = NEW.agency_id;

  PERFORM public.queue_agency_webhook_event(
    'creative_request.created',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'creative_request', NEW.payload,
      'client', v_client_data,
      'agency', v_agency_data,
      'created_at', NEW.created_at,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_creative_request_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.event = 'novojob')
  EXECUTE FUNCTION public.trigger_creative_request_created();

-- 5.2 creative_request.info_requested
CREATE OR REPLACE FUNCTION public.trigger_creative_request_info_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_data JSONB;
  v_agency_data JSONB;
  v_job_status TEXT;
BEGIN
  v_job_status := NEW.payload->>'job_status';
  
  IF v_job_status = 'info_requested' THEN
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = NEW.client_id;

    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = NEW.agency_id;

    PERFORM public.queue_agency_webhook_event(
      'creative_request.info_requested',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_creative_request_info_requested
  AFTER UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (NEW.event = 'novojob' AND (NEW.payload->>'job_status') != (OLD.payload->>'job_status'))
  EXECUTE FUNCTION public.trigger_creative_request_info_requested();

-- 5.3 creative_request.in_production
CREATE OR REPLACE FUNCTION public.trigger_creative_request_in_production()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_data JSONB;
  v_agency_data JSONB;
  v_job_status TEXT;
BEGIN
  v_job_status := NEW.payload->>'job_status';
  
  IF v_job_status = 'in_production' THEN
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = NEW.client_id;

    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = NEW.agency_id;

    PERFORM public.queue_agency_webhook_event(
      'creative_request.in_production',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_creative_request_in_production
  AFTER UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (NEW.event = 'novojob' AND (NEW.payload->>'job_status') != (OLD.payload->>'job_status'))
  EXECUTE FUNCTION public.trigger_creative_request_in_production();

-- 5.4 creative_request.completed
CREATE OR REPLACE FUNCTION public.trigger_creative_request_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_data JSONB;
  v_agency_data JSONB;
  v_job_status TEXT;
BEGIN
  v_job_status := NEW.payload->>'job_status';
  
  IF v_job_status = 'completed' THEN
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = NEW.client_id;

    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = NEW.agency_id;

    PERFORM public.queue_agency_webhook_event(
      'creative_request.completed',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_creative_request_completed
  AFTER UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (NEW.event = 'novojob' AND (NEW.payload->>'job_status') != (OLD.payload->>'job_status'))
  EXECUTE FUNCTION public.trigger_creative_request_completed();

-- 6. FUNÇÃO E CRON PARA LEMBRETES DE ÚLTIMO DIA
-- =========================================

CREATE OR REPLACE FUNCTION public.send_last_day_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content RECORD;
  v_client_data JSONB;
  v_agency_data JSONB;
BEGIN
  FOR v_content IN
    SELECT c.*
    FROM contents c
    WHERE c.status = 'in_review'
      AND c.deadline IS NOT NULL
      AND DATE(c.deadline) = CURRENT_DATE
  LOOP
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = v_content.client_id;

    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = v_content.agency_id;

    PERFORM public.queue_agency_webhook_event(
      'content.last_day_reminder',
      v_content.id,
      v_content.client_id,
      v_content.agency_id,
      jsonb_build_object(
        'content', jsonb_build_object(
          'id', v_content.id,
          'title', v_content.title,
          'type', v_content.type,
          'status', v_content.status,
          'date', v_content.date,
          'deadline', v_content.deadline,
          'channels', v_content.channels
        ),
        'client', v_client_data,
        'agency', v_agency_data,
        'reminder_message', 'Último dia para aprovar este conteúdo!',
        'timestamp', NOW()
      )
    );
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'send-last-day-reminders',
  '0 8 * * *',
  $$SELECT public.send_last_day_reminders()$$
);

-- =========================================
-- FIM DA MIGRAÇÃO
-- =========================================