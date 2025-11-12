-- Adicionar colunas para plano de conteúdo
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS is_content_plan BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_description TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contents_is_content_plan 
ON public.contents(is_content_plan) 
WHERE is_content_plan = true;

-- Comentários para documentação
COMMENT ON COLUMN public.contents.is_content_plan IS 'Indica se é um plano de conteúdo (pré-aprovação) ou conteúdo real';
COMMENT ON COLUMN public.contents.plan_description IS 'Descrição detalhada do plano de conteúdo para aprovação';