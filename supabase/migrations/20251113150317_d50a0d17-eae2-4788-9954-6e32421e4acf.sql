-- Garantir que profiles não está com FORCE RLS
-- Se estiver com FORCE, o SECURITY DEFINER não bypassa RLS e volta a recursão
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- Mesmo para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles NO FORCE ROW LEVEL SECURITY;