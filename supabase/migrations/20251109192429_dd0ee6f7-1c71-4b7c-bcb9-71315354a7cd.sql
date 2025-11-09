-- Tabela para taxas variáveis (% sobre receita)
CREATE TABLE IF NOT EXISTS revenue_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name text NOT NULL,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0.00, -- Percentual (ex: 6.00 para 6%)
  is_fixed boolean NOT NULL DEFAULT false, -- true para fixas (Stripe, Imposto), false para customizadas
  applies_to text NOT NULL DEFAULT 'gross_revenue', -- 'gross_revenue' ou 'net_revenue'
  category text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- Inserir taxas fixas padrão
INSERT INTO revenue_taxes (tax_name, tax_rate, is_fixed, category, applies_to) VALUES
  ('Imposto sobre Receita', 0.00, true, 'Fiscal', 'gross_revenue'),
  ('Taxa Stripe (Transação)', 4.99, true, 'Payment Gateway', 'gross_revenue')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE revenue_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage revenue taxes"
  ON revenue_taxes
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER set_revenue_taxes_updated_at
  BEFORE UPDATE ON revenue_taxes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar coluna cost_type à tabela operational_costs
ALTER TABLE operational_costs 
ADD COLUMN IF NOT EXISTS cost_type text DEFAULT 'operational';

-- Tipos possíveis: 'operational', 'marketing', 'sales'
ALTER TABLE operational_costs
ADD CONSTRAINT valid_cost_type 
CHECK (cost_type IN ('operational', 'marketing', 'sales'));

-- Comentário explicativo
COMMENT ON COLUMN operational_costs.cost_type IS 
'Tipo do custo: operational (padrão), marketing (CAC), sales (CAC)';