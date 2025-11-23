-- ============================================
-- FASE 2: Migrar Triggers Existentes para GET
-- ============================================

-- 1. content.ready_for_approval (atualizar para GET)
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

  PERFORM public.queue_webhook_event(
    'content.ready_for_approval',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    ),
    'agency',
    'GET'
  );

  RETURN NEW;
END;
$$;

-- 2. content.changes_requested (atualizar para GET)
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

  PERFORM public.queue_webhook_event(
    'content.changes_requested',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    ),
    'agency',
    'GET'
  );

  RETURN NEW;
END;
$$;

-- 3. content.adjustment_completed (atualizar para GET)
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

  PERFORM public.queue_webhook_event(
    'content.adjustment_completed',
    NEW.id,
    NEW.client_id,
    NEW.agency_id,
    jsonb_build_object(
      'content', v_content_data,
      'client', v_client_data,
      'agency', v_agency_data,
      'timestamp', NOW()
    ),
    'agency',
    'GET'
  );

  RETURN NEW;
END;
$$;

-- 4. content.auto_approved (atualizar para GET)
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

    PERFORM public.queue_webhook_event(
      'content.auto_approved',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'content', v_content_data,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      ),
      'agency',
      'GET'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. creative_request.created (atualizar para GET)
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

  PERFORM public.queue_webhook_event(
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
    ),
    'agency',
    'GET'
  );

  RETURN NEW;
END;
$$;

-- 6-9. creative_request triggers (info_requested, in_production, completed)
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

    PERFORM public.queue_webhook_event(
      'creative_request.info_requested',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      ),
      'agency',
      'GET'
    );
  END IF;

  RETURN NEW;
END;
$$;

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

    PERFORM public.queue_webhook_event(
      'creative_request.in_production',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      ),
      'agency',
      'GET'
    );
  END IF;

  RETURN NEW;
END;
$$;

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

    PERFORM public.queue_webhook_event(
      'creative_request.completed',
      NEW.id,
      NEW.client_id,
      NEW.agency_id,
      jsonb_build_object(
        'creative_request', NEW.payload,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      ),
      'agency',
      'GET'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 10. send_last_day_reminders (atualizar para GET)
CREATE OR REPLACE FUNCTION public.send_last_day_reminders()
RETURNS VOID
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

    PERFORM public.queue_webhook_event(
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
      ),
      'agency',
      'GET'
    );
  END LOOP;
END;
$$;