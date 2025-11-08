-- Create table for Lovable plan configuration
CREATE TABLE lovable_plan_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  database_quota_mb INTEGER NOT NULL,
  storage_quota_gb INTEGER NOT NULL,
  egress_quota_gb INTEGER NOT NULL,
  
  -- Overage costs in BRL (converted from USD @ R$5.70)
  database_overage_cost_per_gb_month NUMERIC(10,4) DEFAULT 0.7125, -- $0.125 * 5.70
  storage_overage_cost_per_gb NUMERIC(10,4) DEFAULT 0.1197, -- $0.021 * 5.70
  egress_overage_cost_per_gb NUMERIC(10,4) DEFAULT 0.5130, -- $0.09 * 5.70
  
  is_active BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lovable_plan_config ENABLE ROW LEVEL SECURITY;

-- Super admins can manage lovable plans
CREATE POLICY "Super admins can manage lovable plans"
ON lovable_plan_config FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Insert initial configuration (assuming Supabase Pro limits)
INSERT INTO lovable_plan_config (
  plan_name,
  database_quota_mb,
  storage_quota_gb,
  egress_quota_gb,
  is_active,
  notes
) VALUES (
  'Lovable Pro 3 (Supabase Pro Assumed)',
  8000,  -- 8 GB
  100,   -- 100 GB
  250,   -- 250 GB/month
  true,
  'Configuração baseada nos limites do Supabase Pro Plan. Valores conservadores até confirmação oficial do Lovable. Database: 8GB, Storage: 100GB, Bandwidth: 250GB/mês. Atualizar quando houver documentação oficial.'
);

-- Add trigger for updated_at
CREATE TRIGGER update_lovable_plan_config_updated_at
BEFORE UPDATE ON lovable_plan_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();