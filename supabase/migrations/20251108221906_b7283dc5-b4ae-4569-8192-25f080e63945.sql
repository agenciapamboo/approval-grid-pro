-- Criar tabela platform_notifications
CREATE TABLE platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Destinatário (pode ser agência ou creator individual)
  target_type TEXT NOT NULL CHECK (target_type IN ('agency', 'creator', 'all')),
  target_id UUID,
  
  -- Tipo de notificação
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'system_update',
    'resource_alert',
    'payment_reminder',
    'plan_renewal',
    'new_feature',
    'maintenance',
    'critical_alert',
    'general_announcement',
    'payment_due_7_days',
    'payment_due_1_day',
    'payment_due_today',
    'payment_processed',
    'payment_failed',
    'account_suspension_warning',
    'account_suspended'
  )),
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Canais de envio
  send_email BOOLEAN DEFAULT true,
  send_whatsapp BOOLEAN DEFAULT false,
  send_in_app BOOLEAN DEFAULT true,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Prioridade
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- Metadados
  payload JSONB DEFAULT '{}'::jsonb,
  deduplication_key TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_target CHECK (
    (target_type = 'all' AND target_id IS NULL) OR
    (target_type IN ('agency', 'creator') AND target_id IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_platform_notifications_status ON platform_notifications(status);
CREATE INDEX idx_platform_notifications_target ON platform_notifications(target_type, target_id);
CREATE INDEX idx_platform_notifications_created_at ON platform_notifications(created_at DESC);
CREATE INDEX idx_platform_notifications_deduplication ON platform_notifications(deduplication_key) WHERE status = 'sent';

-- RLS
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar todas
CREATE POLICY "Super admins can manage platform notifications"
ON platform_notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Usuários podem ver suas próprias notificações
CREATE POLICY "Users can view their own platform notifications"
ON platform_notifications FOR SELECT
TO authenticated
USING (
  target_type = 'all' 
  OR (target_type = 'agency' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND agency_id = target_id
  ))
  OR (target_type = 'creator' AND target_id = auth.uid())
);

-- Usuários podem marcar como lida suas próprias notificações
CREATE POLICY "Users can update read status"
ON platform_notifications FOR UPDATE
TO authenticated
USING (
  target_type = 'all' 
  OR (target_type = 'agency' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND agency_id = target_id
  ))
  OR (target_type = 'creator' AND target_id = auth.uid())
);