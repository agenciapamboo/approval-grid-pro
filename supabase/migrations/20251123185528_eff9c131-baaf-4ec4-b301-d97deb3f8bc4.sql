-- ============================================
-- FASE 1: Preparação do Banco de Dados
-- ============================================

-- 1. Adicionar webhook de clientes em system_settings
INSERT INTO public.system_settings (key, value, description, updated_by)
VALUES (
  'client_notifications_webhook_url',
  'https://n8n.pamboocriativos.com.br/webhook-test/d4fa3353-7ea1-420e-8bb2-notifica-clientes',
  'URL do webhook N8N para notificações de clientes (boas-vindas, vencimentos, alertas, relatórios)',
  auth.uid()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Adicionar colunas em webhook_events
ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS http_method TEXT DEFAULT 'POST' CHECK (http_method IN ('GET', 'POST')),
ADD COLUMN IF NOT EXISTS webhook_type TEXT DEFAULT 'agency' CHECK (webhook_type IN ('agency', 'client')),
ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_events_type_status ON public.webhook_events(webhook_type, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_last_notification ON public.webhook_events(last_notification_at);

-- 3. Refatorar função queue_webhook_event para suportar dual webhook + GET/POST
CREATE OR REPLACE FUNCTION public.queue_webhook_event(
  p_event TEXT,
  p_content_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::JSONB,
  p_webhook_type TEXT DEFAULT 'agency',
  p_method TEXT DEFAULT 'GET'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT;
  v_event_id UUID;
  v_setting_key TEXT;
BEGIN
  -- Determinar qual webhook usar
  v_setting_key := CASE 
    WHEN p_webhook_type = 'client' THEN 'client_notifications_webhook_url'
    ELSE 'agency_notifications_webhook_url'
  END;

  -- Buscar URL do webhook
  SELECT value INTO v_webhook_url
  FROM public.system_settings
  WHERE key = v_setting_key;

  -- Se não houver webhook configurado, retornar NULL
  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NULL;
  END IF;

  -- Inserir evento na fila
  INSERT INTO public.webhook_events (
    client_id,
    event,
    payload,
    status,
    http_method,
    webhook_type
  ) VALUES (
    p_client_id,
    p_event,
    p_payload,
    'queued',
    p_method,
    p_webhook_type
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ============================================
-- FASE 3: content.approved Batching
-- ============================================

-- Remover trigger imediato on_content_approved (se existir)
DROP TRIGGER IF EXISTS on_content_approved ON public.contents;
DROP FUNCTION IF EXISTS public.trigger_content_approved();

-- Criar função para envio horário de aprovações
CREATE OR REPLACE FUNCTION public.send_hourly_approval_notifications()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content RECORD;
  v_client_data JSONB;
  v_agency_data JSONB;
  v_approved_contents JSONB[] := ARRAY[]::JSONB[];
  v_last_hour TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
BEGIN
  -- Buscar conteúdos aprovados na última hora que ainda não foram notificados
  FOR v_content IN
    SELECT c.*
    FROM contents c
    LEFT JOIN webhook_events we ON 
      we.event = 'content.approved' 
      AND we.payload->>'content_id' = c.id::TEXT
      AND we.last_notification_at > v_last_hour
    WHERE c.status = 'approved'
      AND c.updated_at > v_last_hour
      AND we.id IS NULL -- Apenas conteúdos não notificados
    ORDER BY c.updated_at ASC
  LOOP
    -- Buscar dados do cliente
    SELECT jsonb_build_object(
      'id', cl.id,
      'name', cl.name,
      'slug', cl.slug
    ) INTO v_client_data
    FROM clients cl
    WHERE cl.id = v_content.client_id;

    -- Buscar dados da agência
    SELECT jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'slug', a.slug
    ) INTO v_agency_data
    FROM agencies a
    WHERE a.id = v_content.agency_id;

    -- Adicionar ao array
    v_approved_contents := array_append(
      v_approved_contents,
      jsonb_build_object(
        'id', v_content.id,
        'title', v_content.title,
        'type', v_content.type,
        'status', v_content.status,
        'date', v_content.date,
        'channels', v_content.channels,
        'approved_at', v_content.updated_at
      )
    );
  END LOOP;

  -- Se houver conteúdos aprovados, enviar notificação única
  IF array_length(v_approved_contents, 1) > 0 THEN
    PERFORM public.queue_webhook_event(
      'content.approved',
      NULL, -- content_id (múltiplos conteúdos)
      (v_approved_contents[1]->>'client_id')::UUID,
      (v_approved_contents[1]->>'agency_id')::UUID,
      jsonb_build_object(
        'total_approved', array_length(v_approved_contents, 1),
        'contents', v_approved_contents,
        'client', v_client_data,
        'agency', v_agency_data,
        'timestamp', NOW()
      ),
      'agency', -- webhook_type
      'GET'     -- http_method
    );

    -- Atualizar last_notification_at para evitar duplicatas
    UPDATE webhook_events
    SET last_notification_at = NOW()
    WHERE event = 'content.approved'
      AND created_at > v_last_hour;
  END IF;
END;
$$;

-- ============================================
-- FASE 5: Quota Alerts Dual Frequency
-- ============================================

-- Função para alertas diários (70%, 90%, 100%)
CREATE OR REPLACE FUNCTION public.check_daily_quota_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_agency RECORD;
  v_usage_count INTEGER;
  v_quota INTEGER;
  v_percentage NUMERIC;
  v_alert_threshold INTEGER;
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
  -- Alertas de quota de clientes
  FOR v_client IN
    SELECT c.*, a.name as agency_name
    FROM clients c
    JOIN agencies a ON a.id = c.agency_id
    WHERE c.monthly_creatives IS NOT NULL AND c.monthly_creatives > 0
  LOOP
    -- Contar uso mensal
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM contents
    WHERE client_id = v_client.id
      AND created_at >= v_month_start
      AND created_at < v_month_start + INTERVAL '1 month';

    v_quota := v_client.monthly_creatives;
    v_percentage := ROUND((v_usage_count::NUMERIC / v_quota::NUMERIC) * 100, 2);

    -- Verificar se atingiu algum threshold (70%, 90%, 100%)
    FOR v_alert_threshold IN SELECT * FROM unnest(ARRAY[70, 90, 100])
    LOOP
      IF v_percentage >= v_alert_threshold AND v_percentage < (v_alert_threshold + 10) THEN
        -- Verificar se já foi alertado este mês para este threshold
        IF NOT EXISTS (
          SELECT 1 FROM webhook_events
          WHERE event = 'client.quota_alert'
            AND payload->>'client_id' = v_client.id::TEXT
            AND payload->>'threshold' = v_alert_threshold::TEXT
            AND created_at >= v_month_start
        ) THEN
          PERFORM public.queue_webhook_event(
            'client.quota_alert',
            NULL,
            v_client.id,
            v_client.agency_id,
            jsonb_build_object(
              'client_id', v_client.id,
              'client_name', v_client.name,
              'agency_name', v_client.agency_name,
              'quota', v_quota,
              'usage', v_usage_count,
              'percentage', v_percentage,
              'threshold', v_alert_threshold,
              'month', TO_CHAR(v_today, 'YYYY-MM'),
              'timestamp', NOW()
            ),
            'client',
            'GET'
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Alertas de quota de agências (soma de todos os clientes)
  FOR v_agency IN
    SELECT a.id, a.name, SUM(c.monthly_creatives) as total_quota
    FROM agencies a
    JOIN clients c ON c.agency_id = a.id
    WHERE c.monthly_creatives IS NOT NULL
    GROUP BY a.id, a.name
    HAVING SUM(c.monthly_creatives) > 0
  LOOP
    -- Contar uso mensal da agência
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM contents ct
    WHERE ct.agency_id = v_agency.id
      AND ct.created_at >= v_month_start
      AND ct.created_at < v_month_start + INTERVAL '1 month';

    v_quota := v_agency.total_quota;
    v_percentage := ROUND((v_usage_count::NUMERIC / v_quota::NUMERIC) * 100, 2);

    -- Verificar thresholds
    FOR v_alert_threshold IN SELECT * FROM unnest(ARRAY[70, 90, 100])
    LOOP
      IF v_percentage >= v_alert_threshold AND v_percentage < (v_alert_threshold + 10) THEN
        IF NOT EXISTS (
          SELECT 1 FROM webhook_events
          WHERE event = 'agency.quota_alert'
            AND payload->>'agency_id' = v_agency.id::TEXT
            AND payload->>'threshold' = v_alert_threshold::TEXT
            AND created_at >= v_month_start
        ) THEN
          PERFORM public.queue_webhook_event(
            'agency.quota_alert',
            NULL,
            NULL,
            v_agency.id,
            jsonb_build_object(
              'agency_id', v_agency.id,
              'agency_name', v_agency.name,
              'quota', v_quota,
              'usage', v_usage_count,
              'percentage', v_percentage,
              'threshold', v_alert_threshold,
              'month', TO_CHAR(v_today, 'YYYY-MM'),
              'timestamp', NOW()
            ),
            'client',
            'GET'
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Função para alertas semanais (>100% overage)
CREATE OR REPLACE FUNCTION public.check_weekly_overage_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client RECORD;
  v_agency RECORD;
  v_usage_count INTEGER;
  v_quota INTEGER;
  v_percentage NUMERIC;
  v_overage INTEGER;
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
BEGIN
  -- Overage de clientes (apenas se >100%)
  FOR v_client IN
    SELECT c.*, a.name as agency_name
    FROM clients c
    JOIN agencies a ON a.id = c.agency_id
    WHERE c.monthly_creatives IS NOT NULL AND c.monthly_creatives > 0
  LOOP
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM contents
    WHERE client_id = v_client.id
      AND created_at >= v_month_start
      AND created_at < v_month_start + INTERVAL '1 month';

    v_quota := v_client.monthly_creatives;
    v_percentage := ROUND((v_usage_count::NUMERIC / v_quota::NUMERIC) * 100, 2);
    v_overage := v_usage_count - v_quota;

    IF v_percentage > 100 THEN
      -- Verificar se já foi alertado esta semana
      IF NOT EXISTS (
        SELECT 1 FROM webhook_events
        WHERE event = 'client.quota_alert'
          AND payload->>'client_id' = v_client.id::TEXT
          AND payload->>'alert_type' = 'overage'
          AND created_at >= v_week_start
      ) THEN
        PERFORM public.queue_webhook_event(
          'client.quota_alert',
          NULL,
          v_client.id,
          v_client.agency_id,
          jsonb_build_object(
            'client_id', v_client.id,
            'client_name', v_client.name,
            'agency_name', v_client.agency_name,
            'quota', v_quota,
            'usage', v_usage_count,
            'percentage', v_percentage,
            'overage', v_overage,
            'alert_type', 'overage',
            'month', TO_CHAR(v_today, 'YYYY-MM'),
            'week', TO_CHAR(v_week_start, 'YYYY-WW'),
            'timestamp', NOW()
          ),
          'client',
          'GET'
        );
      END IF;
    END IF;
  END LOOP;

  -- Overage de agências
  FOR v_agency IN
    SELECT a.id, a.name, SUM(c.monthly_creatives) as total_quota
    FROM agencies a
    JOIN clients c ON c.agency_id = a.id
    WHERE c.monthly_creatives IS NOT NULL
    GROUP BY a.id, a.name
    HAVING SUM(c.monthly_creatives) > 0
  LOOP
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM contents ct
    WHERE ct.agency_id = v_agency.id
      AND ct.created_at >= v_month_start
      AND ct.created_at < v_month_start + INTERVAL '1 month';

    v_quota := v_agency.total_quota;
    v_percentage := ROUND((v_usage_count::NUMERIC / v_quota::NUMERIC) * 100, 2);
    v_overage := v_usage_count - v_quota;

    IF v_percentage > 100 THEN
      IF NOT EXISTS (
        SELECT 1 FROM webhook_events
        WHERE event = 'agency.quota_alert'
          AND payload->>'agency_id' = v_agency.id::TEXT
          AND payload->>'alert_type' = 'overage'
          AND created_at >= v_week_start
      ) THEN
        PERFORM public.queue_webhook_event(
          'agency.quota_alert',
          NULL,
          NULL,
          v_agency.id,
          jsonb_build_object(
            'agency_id', v_agency.id,
            'agency_name', v_agency.name,
            'quota', v_quota,
            'usage', v_usage_count,
            'percentage', v_percentage,
            'overage', v_overage,
            'alert_type', 'overage',
            'month', TO_CHAR(v_today, 'YYYY-MM'),
            'week', TO_CHAR(v_week_start, 'YYYY-WW'),
            'timestamp', NOW()
          ),
          'client',
          'GET'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;