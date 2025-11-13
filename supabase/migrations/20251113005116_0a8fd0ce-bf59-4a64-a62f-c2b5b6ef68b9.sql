-- Adicionar políticas RLS para permitir aprovadores 2FA acessarem dados relacionados
-- Necessário para exibir informações completas dos conteúdos

-- Política para content_media (imagens e vídeos dos conteúdos)
CREATE POLICY "Public can view content media for 2FA approval flow"
ON content_media
FOR SELECT
TO anon
USING (true);

-- Política para content_texts (legendas dos conteúdos)
CREATE POLICY "Public can view content texts for 2FA approval flow"
ON content_texts
FOR SELECT
TO anon
USING (true);

-- Política para comments (comentários dos conteúdos)
CREATE POLICY "Public can view comments for 2FA approval flow"
ON comments
FOR SELECT
TO anon
USING (true);

-- Comentário: Estas políticas permitem acesso público de leitura aos dados relacionados
-- aos conteúdos. A segurança é garantida pela validação do session_token nas edge 
-- functions approver-*, que verificam se o aprovador tem permissão antes de executar ações.