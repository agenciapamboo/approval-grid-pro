-- Remover políticas recursivas problemáticas
DROP POLICY IF EXISTS "agency_admin_select_profiles" ON profiles;
DROP POLICY IF EXISTS "team_member_select_profiles" ON profiles;
DROP POLICY IF EXISTS "approver_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "client_user_select_own_profile" ON profiles;

-- Criar política simples: todos os usuários autenticados podem ler seu próprio perfil
CREATE POLICY "users_select_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Super admin pode ver todos os perfis
-- (já existe: super_admin_select_profiles)