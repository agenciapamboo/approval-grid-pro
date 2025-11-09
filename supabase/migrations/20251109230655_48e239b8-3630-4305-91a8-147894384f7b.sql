-- PARTE 1: Refatorar tabela tracking_pixels para sistema global
-- Primeiro remover policies que dependem de client_id

DROP POLICY IF EXISTS "Agency admins can view their clients' pixels" ON tracking_pixels;
DROP POLICY IF EXISTS "Agency admins can manage their clients' pixels" ON tracking_pixels;

-- Agora podemos remover a coluna client_id e constraint
ALTER TABLE tracking_pixels DROP COLUMN IF EXISTS client_id;
ALTER TABLE tracking_pixels DROP CONSTRAINT IF EXISTS tracking_pixels_client_id_key;

-- Garantir apenas um registro global
DROP INDEX IF EXISTS idx_tracking_pixels_singleton;
CREATE UNIQUE INDEX idx_tracking_pixels_singleton ON tracking_pixels ((true));

-- Criar nova policy para super admins
CREATE POLICY "Only super admins can manage global pixels"
  ON tracking_pixels FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- PARTE 2: Refatorar tabela conversion_events para rastreamento global
-- Remover policies que dependem de client_id

DROP POLICY IF EXISTS "Agency admins can view their clients' conversion events" ON conversion_events;

-- Remover client_id, adicionar user_id e dados de subscription
ALTER TABLE conversion_events DROP COLUMN IF EXISTS client_id;
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS subscription_value DECIMAL(10,2);

-- Atualizar índices
DROP INDEX IF EXISTS idx_conversion_events_client_id;
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_subscription_plan ON conversion_events(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name ON conversion_events(event_name);

-- Criar nova policy para super admins
CREATE POLICY "Only super admins can view conversion events"
  ON conversion_events FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- PARTE 3: Remover tabela utm_campaigns (não é mais necessária)
DROP TABLE IF EXISTS utm_campaigns CASCADE;