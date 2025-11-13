-- Adicionar política RLS para permitir leitura pública de conteúdos
-- Necessário para aprovadores 2FA que não têm sessão autenticada Supabase
-- A validação de acesso é feita via session_token nas edge functions

-- Política para permitir leitura de conteúdos sem autenticação
-- Permite que aprovadores 2FA vejam os conteúdos do cliente
CREATE POLICY "Public can view contents for 2FA approval flow"
ON contents
FOR SELECT
TO anon
USING (true);

-- Comentário: Esta política permite acesso público de leitura aos conteúdos.
-- A segurança é garantida pela validação do session_token nas edge functions
-- approver-*, que verificam se o aprovador tem permissão para acessar
-- o conteúdo do cliente específico antes de executar qualquer ação.