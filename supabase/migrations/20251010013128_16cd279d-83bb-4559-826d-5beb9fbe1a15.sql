-- Criar políticas RLS para acesso público aos conteúdos via slug

-- Permitir visualização pública de clientes através do slug
CREATE POLICY "Anyone can view clients by slug"
ON public.clients
FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir visualização pública de agências através do slug
CREATE POLICY "Anyone can view agencies by slug"
ON public.agencies
FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir visualização pública de conteúdos aprovados
CREATE POLICY "Anyone can view approved contents"
ON public.contents
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Permitir visualização pública de mídias de conteúdos aprovados
CREATE POLICY "Anyone can view media of approved contents"
ON public.content_media
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contents
    WHERE contents.id = content_media.content_id
    AND contents.status = 'approved'
  )
);

-- Permitir visualização pública de textos de conteúdos aprovados
CREATE POLICY "Anyone can view texts of approved contents"
ON public.content_texts
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contents
    WHERE contents.id = content_texts.content_id
    AND contents.status = 'approved'
  )
);

-- Permitir visualização pública de comentários de conteúdos aprovados
CREATE POLICY "Anyone can view comments of approved contents"
ON public.comments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contents
    WHERE contents.id = comments.content_id
    AND contents.status = 'approved'
  )
);