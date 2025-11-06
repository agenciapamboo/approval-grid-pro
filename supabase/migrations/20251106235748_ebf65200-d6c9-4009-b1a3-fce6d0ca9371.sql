-- Remover políticas RLS que permitem acesso público sem autenticação

-- Remover política de acesso público a conteúdos in_review
DROP POLICY IF EXISTS "Public can view in_review contents for approval" ON public.contents;

-- Remover política de acesso público a comentários de conteúdos in_review
DROP POLICY IF EXISTS "Public can view comments of in_review contents" ON public.comments;

-- Remover política de acesso público a textos de conteúdos in_review
DROP POLICY IF EXISTS "Public can view texts of in_review contents" ON public.content_texts;

-- Remover política de acesso público a mídias de conteúdos in_review
DROP POLICY IF EXISTS "Public can view media of in_review contents" ON public.content_media;

-- Agora o acesso só será possível via autenticação ou através da validação de token
-- na aplicação (edge function validate-approval-token)