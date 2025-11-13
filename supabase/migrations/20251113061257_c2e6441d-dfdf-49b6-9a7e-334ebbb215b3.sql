-- =====================================================
-- CORREÇÃO DEFINITIVA: Eliminar recursão infinita
-- =====================================================
-- Criar funções SECURITY DEFINER para evitar recursão em políticas RLS

-- 1. Função para obter agency_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM public.profiles
  WHERE id = _user_id;
$$;

-- 2. Função para obter client_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE id = _user_id;
$$;

-- 3. Função para verificar se usuário pertence a uma agência
CREATE OR REPLACE FUNCTION public.user_belongs_to_agency(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND agency_id = _agency_id
  );
$$;

-- 4. Função para verificar se usuário pertence a um cliente
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND client_id = _client_id
  );
$$;