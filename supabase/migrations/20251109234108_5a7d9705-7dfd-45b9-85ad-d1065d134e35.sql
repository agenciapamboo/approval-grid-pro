-- Parte 1: Melhorias do Dashboard - Banco de Dados

-- 1. Adicionar novo status 'archived' ao enum content_status
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'archived';

-- 2. Criar tabela kanban_columns para colunas customizáveis
CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  column_color TEXT NOT NULL DEFAULT '#6B7280',
  column_order INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, column_id)
);

-- 3. Adicionar trigger para updated_at
CREATE OR REPLACE FUNCTION update_kanban_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_kanban_columns_updated_at
  BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_columns_updated_at();

-- 4. Popular colunas padrão do sistema para todas as agências existentes
INSERT INTO public.kanban_columns (agency_id, column_id, column_name, column_color, column_order, is_system)
SELECT 
  a.id as agency_id,
  column_data.column_id,
  column_data.column_name,
  column_data.column_color,
  column_data.column_order,
  TRUE as is_system
FROM agencies a
CROSS JOIN (
  VALUES 
    ('requests', 'Solicitações', '#8B5CF6', 1),
    ('draft', 'Rascunho', '#6B7280', 2),
    ('in_review', 'Em Revisão', '#F59E0B', 3),
    ('scheduled', 'Agendado', '#10B981', 4)
) AS column_data(column_id, column_name, column_color, column_order)
ON CONFLICT (agency_id, column_id) DO NOTHING;

-- 5. Habilitar RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS
CREATE POLICY "Agency admins can view their kanban columns"
  ON public.kanban_columns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.agency_id = kanban_columns.agency_id
      AND has_role(auth.uid(), 'agency_admin')
    )
  );

CREATE POLICY "Agency admins can insert their kanban columns"
  ON public.kanban_columns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.agency_id = kanban_columns.agency_id
      AND has_role(auth.uid(), 'agency_admin')
    )
  );

CREATE POLICY "Agency admins can update their kanban columns"
  ON public.kanban_columns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.agency_id = kanban_columns.agency_id
      AND has_role(auth.uid(), 'agency_admin')
    )
  );

CREATE POLICY "Agency admins can delete non-system kanban columns"
  ON public.kanban_columns
  FOR DELETE
  USING (
    is_system = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.agency_id = kanban_columns.agency_id
      AND has_role(auth.uid(), 'agency_admin')
    )
  );

-- 7. Criar índices para performance
CREATE INDEX idx_kanban_columns_agency_id ON public.kanban_columns(agency_id);
CREATE INDEX idx_kanban_columns_column_order ON public.kanban_columns(agency_id, column_order);

COMMENT ON TABLE public.kanban_columns IS 'Configuração customizável de colunas do kanban por agência';
COMMENT ON COLUMN public.kanban_columns.is_system IS 'Colunas do sistema não podem ser deletadas';
COMMENT ON COLUMN public.kanban_columns.column_order IS 'Ordem de exibição das colunas (menor = mais à esquerda)';