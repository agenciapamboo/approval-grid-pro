-- Tabela para armazenar custos operacionais fixos e customizados
CREATE TABLE IF NOT EXISTS operational_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_name text NOT NULL,
  cost_value numeric(10,2) NOT NULL DEFAULT 0.00,
  is_fixed boolean NOT NULL DEFAULT false,
  category text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir custos fixos padrão
INSERT INTO operational_costs (cost_name, cost_value, is_fixed, category) VALUES
  ('Lovable', 0.00, true, 'Infraestrutura'),
  ('Supabase', 0.00, true, 'Infraestrutura'),
  ('ChatGPT', 0.00, true, 'IA'),
  ('Internet', 0.00, true, 'Infraestrutura')
ON CONFLICT DO NOTHING;

-- RLS Policies (apenas super_admin pode gerenciar)
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage operational costs"
  ON operational_costs
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_operational_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_operational_costs_updated_at
  BEFORE UPDATE ON operational_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_operational_costs_updated_at();