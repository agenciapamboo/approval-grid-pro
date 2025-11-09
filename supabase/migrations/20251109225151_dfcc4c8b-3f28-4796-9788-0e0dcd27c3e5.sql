-- Tabela de pixels de rastreamento por cliente
CREATE TABLE IF NOT EXISTS tracking_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Meta/Facebook
  meta_pixel_id TEXT,
  meta_access_token_encrypted TEXT,
  meta_test_event_code TEXT,
  
  -- Google
  google_ads_conversion_id TEXT,
  google_ads_conversion_label TEXT,
  google_analytics_id TEXT,
  google_tag_manager_id TEXT,
  google_oauth_refresh_token_encrypted TEXT,
  
  -- TikTok
  tiktok_pixel_id TEXT,
  tiktok_access_token_encrypted TEXT,
  
  -- LinkedIn
  linkedin_partner_id TEXT,
  
  -- Pinterest
  pinterest_tag_id TEXT,
  pinterest_access_token_encrypted TEXT,
  
  -- Configurações gerais
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id)
);

-- Tabela de log de eventos de conversão
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Identificação do evento
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  
  -- Plataformas para as quais foi enviado
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Dados do evento
  event_time TIMESTAMPTZ NOT NULL,
  event_source_url TEXT,
  
  -- Dados do usuário (hashed)
  user_email_hash TEXT,
  user_phone_hash TEXT,
  user_external_id TEXT,
  user_ip TEXT,
  user_agent TEXT,
  
  -- Dados de comércio
  currency TEXT,
  value DECIMAL(10,2),
  content_ids TEXT[],
  content_type TEXT,
  content_category TEXT,
  num_items INTEGER,
  
  -- UTM e rastreamento
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Status de envio por plataforma
  send_status JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de campanhas UTM
CREATE TABLE IF NOT EXISTS utm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Identificação da campanha
  name TEXT NOT NULL,
  description TEXT,
  
  -- Parâmetros UTM
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT,
  utm_content TEXT,
  
  -- URL base
  base_url TEXT NOT NULL,
  
  -- Metadados
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversion_events_client_id ON conversion_events(client_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name ON conversion_events(event_name);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_client_id ON utm_campaigns(client_id);

-- RLS Policies para tracking_pixels
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view their clients' pixels"
  ON tracking_pixels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
        AND c.id = tracking_pixels.client_id
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Agency admins can manage their clients' pixels"
  ON tracking_pixels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
        AND has_role(auth.uid(), 'agency_admin')
        AND c.id = tracking_pixels.client_id
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- RLS Policies para conversion_events
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can view their clients' conversion events"
  ON conversion_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
        AND c.id = conversion_events.client_id
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "System can insert conversion events"
  ON conversion_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies para utm_campaigns
ALTER TABLE utm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage their clients' UTM campaigns"
  ON utm_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
        AND c.id = utm_campaigns.client_id
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tracking_pixels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracking_pixels_updated_at
  BEFORE UPDATE ON tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_pixels_updated_at();

CREATE TRIGGER utm_campaigns_updated_at
  BEFORE UPDATE ON utm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_pixels_updated_at();