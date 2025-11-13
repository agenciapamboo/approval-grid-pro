-- DROP CASCADE para remover funções e todas as políticas que dependem delas
-- Depois recriaremos as políticas manualmente
DROP FUNCTION IF EXISTS public.get_user_agency_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_client_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Recriar funções com nomes de parâmetros corretos
-- has_role: cast explícito de TEXT para app_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

-- get_user_agency_id: começa em auth.users e faz LEFT JOIN
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.agency_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = _user_id
  LIMIT 1;
$$;

-- get_user_client_id: idem
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.client_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.id = _user_id
  LIMIT 1;
$$;

-- Owner e grants
ALTER FUNCTION public.has_role(uuid, app_role) OWNER TO postgres;
ALTER FUNCTION public.get_user_agency_id(uuid) OWNER TO postgres;
ALTER FUNCTION public.get_user_client_id(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_agency_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_client_id(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_agency_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_client_id(uuid) TO authenticated;