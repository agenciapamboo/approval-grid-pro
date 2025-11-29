-- Criar tabela de cache de legendas por agência para Machine Learning e reaproveitamento
CREATE TABLE IF NOT EXISTS public.agency_caption_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('caption', 'script', 'carousel')),
  title TEXT,
  caption TEXT NOT NULL,
  slides JSONB, -- Para carrosséis: [{order: 0, headline: '', text: ''}]
  pillar TEXT,
  tone TEXT[],
  objective TEXT,
  hashtags TEXT[],
  template_id UUID REFERENCES public.ai_text_templates(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX idx_agency_caption_cache_agency ON public.agency_caption_cache(agency_id);
CREATE INDEX idx_agency_caption_cache_type ON public.agency_caption_cache(content_type);
CREATE INDEX idx_agency_caption_cache_pillar ON public.agency_caption_cache(pillar);
CREATE INDEX idx_agency_caption_cache_client ON public.agency_caption_cache(client_id);

-- RLS
ALTER TABLE public.agency_caption_cache ENABLE ROW LEVEL SECURITY;

-- Agency admins e team members podem ver cache de sua agência
CREATE POLICY "agency_caption_cache_select" ON public.agency_caption_cache
  FOR SELECT USING (
    agency_id = get_user_agency_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Agency admins e team members podem inserir no cache de sua agência
CREATE POLICY "agency_caption_cache_insert" ON public.agency_caption_cache
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Agency admins e team members podem atualizar cache de sua agência
CREATE POLICY "agency_caption_cache_update" ON public.agency_caption_cache
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Agency admins e team members podem deletar cache de sua agência
CREATE POLICY "agency_caption_cache_delete" ON public.agency_caption_cache
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid()) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );