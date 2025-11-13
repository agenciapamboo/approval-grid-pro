-- Corrigir RLS da tabela role_permissions
-- Permitir que todos os usuários autenticados LEIAM suas permissões (mas não modifiquem)

-- Policy para leitura: todos podem ler role_permissions
CREATE POLICY "Authenticated users can read role permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Nota: A policy de gestão (INSERT/UPDATE/DELETE) permanece restrita a super_admins