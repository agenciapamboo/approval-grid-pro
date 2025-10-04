-- Adicionar tabela para páginas LGPD (Termos e Política)
CREATE TABLE IF NOT EXISTS public.lgpd_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL CHECK (page_type IN ('terms', 'privacy')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(page_type)
);

ALTER TABLE public.lgpd_pages ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar páginas LGPD
CREATE POLICY "Super admins can manage LGPD pages"
  ON public.lgpd_pages
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Todos podem ler as páginas LGPD
CREATE POLICY "Anyone can read LGPD pages"
  ON public.lgpd_pages
  FOR SELECT
  TO authenticated
  USING (true);

-- Adicionar campo para comentário de ajuste obrigatório
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_adjustment_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Trigger para updated_at em lgpd_pages
CREATE TRIGGER update_lgpd_pages_updated_at
  BEFORE UPDATE ON public.lgpd_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir páginas padrão se não existirem
INSERT INTO public.lgpd_pages (page_type, content)
VALUES 
  ('terms', '<h1>Termos de Uso</h1><p>Conteúdo padrão dos termos de uso. Edite este texto conforme necessário.</p>'),
  ('privacy', '<h1>Política de Privacidade</h1><p>Conteúdo padrão da política de privacidade. Edite este texto conforme necessário.</p>')
ON CONFLICT (page_type) DO NOTHING;

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.contents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_texts;