-- ========================================
-- Fase 1: Tabela de Snapshots Financeiros
-- ========================================

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Distribuição de clientes por plano
  creator_count INTEGER DEFAULT 0,
  eugencia_count INTEGER DEFAULT 0,
  socialmidia_count INTEGER DEFAULT 0,
  fullservice_count INTEGER DEFAULT 0,
  unlimited_count INTEGER DEFAULT 0,
  
  -- Receita por plano (em centavos BRL)
  creator_mrr INTEGER DEFAULT 0,
  eugencia_mrr INTEGER DEFAULT 0,
  socialmidia_mrr INTEGER DEFAULT 0,
  fullservice_mrr INTEGER DEFAULT 0,
  unlimited_mrr INTEGER DEFAULT 0,
  
  -- Métricas gerais
  total_active_subscriptions INTEGER DEFAULT 0,
  total_mrr INTEGER DEFAULT 0,
  average_ticket_brl NUMERIC(10,2),
  
  -- Churn
  cancellations_this_month INTEGER DEFAULT 0,
  churn_rate NUMERIC(5,2),
  
  -- Projeção
  projected_mrr_next_month INTEGER DEFAULT 0,
  projected_new_clients INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);

-- RLS
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view financial snapshots"
ON financial_snapshots FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert financial snapshots"
ON financial_snapshots FOR INSERT
WITH CHECK (true);

-- ========================================
-- Fase 2: View de Distribuição de Assinaturas
-- ========================================

CREATE OR REPLACE VIEW current_subscription_distribution AS
SELECT 
  p.plan,
  p.subscription_status,
  COUNT(*) as total,
  SUM(CASE 
    WHEN p.subscription_status IN ('active', 'trialing') THEN 1 
    ELSE 0 
  END) as active_count
FROM profiles p
WHERE p.account_type IN ('creator', 'agency')
GROUP BY p.plan, p.subscription_status;

-- ========================================
-- Fase 3: RPC Functions para Uso de Recursos
-- ========================================

-- Função para obter tamanho do database em MB
CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS NUMERIC AS $$
BEGIN
  RETURN (SELECT pg_database_size(current_database()) / (1024.0 * 1024.0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter tamanho do storage em GB
CREATE OR REPLACE FUNCTION get_storage_size_gb()
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0) / (1024.0 * 1024.0 * 1024.0)
    FROM storage.objects
    WHERE bucket_id = 'content-media'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para estimar bandwidth mensal em GB
CREATE OR REPLACE FUNCTION get_monthly_bandwidth_gb()
RETURNS NUMERIC AS $$
BEGIN
  -- Estimativa conservadora: tamanho total dos objetos do mês × fator de acesso (0.5)
  RETURN (
    SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0) / (1024.0 * 1024.0 * 1024.0) * 0.5
    FROM storage.objects
    WHERE bucket_id = 'content-media'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;