-- Políticas mínimas em profiles e user_roles (apenas SELECT)
-- Não usa políticas em profiles que chamem funções que toquem profiles de novo

-- PROFILES
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_super ON public.profiles;
DROP POLICY IF EXISTS agency_admin_profiles ON public.profiles;
DROP POLICY IF EXISTS users_select_own_profile ON public.profiles;
DROP POLICY IF EXISTS super_admin_all_profiles ON public.profiles;

CREATE POLICY profiles_select_self
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_select_super
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- (Opcional) Se o agency_admin realmente precisar ler perfis da própria agência:
-- Esta política NÃO recursa (usa get_user_agency_id com SECURITY DEFINER válido)
CREATE POLICY profiles_select_agency_admin
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'agency_admin'::app_role)
    AND agency_id = get_user_agency_id(auth.uid())
  );

-- USER_ROLES
DROP POLICY IF EXISTS user_roles_select_self ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_super ON public.user_roles;

CREATE POLICY user_roles_select_self
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_roles_select_super
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));