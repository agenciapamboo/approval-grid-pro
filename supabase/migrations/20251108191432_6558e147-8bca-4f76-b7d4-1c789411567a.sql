-- Criar tabela para histórico de execuções de testes
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL CHECK (test_type IN ('unit', 'e2e', 'coverage')),
  status TEXT NOT NULL CHECK (status IN ('running', 'passed', 'failed', 'error')),
  results JSONB,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_test_runs_executed_by ON public.test_runs(executed_by);
CREATE INDEX idx_test_runs_created_at ON public.test_runs(created_at DESC);
CREATE INDEX idx_test_runs_test_type ON public.test_runs(test_type);

-- Habilitar RLS
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas super admins podem acessar
CREATE POLICY "Super admins can view test runs"
  ON public.test_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert test runs"
  ON public.test_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update test runs"
  ON public.test_runs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_test_runs_updated_at
  BEFORE UPDATE ON public.test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();