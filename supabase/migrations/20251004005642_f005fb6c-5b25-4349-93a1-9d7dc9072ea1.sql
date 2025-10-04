-- Criar agência Pamboo
INSERT INTO public.agencies (id, name, slug, brand_primary, brand_secondary)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Pamboo Agência',
  'pamboo',
  '#3b82f6',
  '#8b5cf6'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    brand_primary = EXCLUDED.brand_primary,
    brand_secondary = EXCLUDED.brand_secondary;

-- Criar cliente da Pamboo
INSERT INTO public.clients (id, name, slug, agency_id, timezone)
VALUES (
  'c1d2e3f4-a5b6-7890-cdef-ab1234567890',
  'Cliente Pamboo',
  'cliente-pamboo',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'America/Sao_Paulo'
)
ON CONFLICT (slug, agency_id) DO UPDATE
SET name = EXCLUDED.name;

-- Atualizar perfil do contato@pamboo.com.br para ser admin da agência Pamboo
UPDATE public.profiles
SET 
  role = 'agency_admin',
  agency_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  client_id = NULL
WHERE name = 'contato@pamboo.com.br'
  OR id IN (
    SELECT id FROM auth.users WHERE email = 'contato@pamboo.com.br'
  );

-- Atualizar perfil do financeiro@pamboo.com.br para ser usuário do cliente
UPDATE public.profiles
SET 
  role = 'client_user',
  client_id = 'c1d2e3f4-a5b6-7890-cdef-ab1234567890',
  agency_id = NULL
WHERE name = 'financeiro@pamboo.com.br'
  OR id IN (
    SELECT id FROM auth.users WHERE email = 'financeiro@pamboo.com.br'
  );

-- Definir o usuário financeiro como responsável do cliente
UPDATE public.clients
SET responsible_user_id = (
  SELECT id FROM auth.users WHERE email = 'financeiro@pamboo.com.br' LIMIT 1
)
WHERE id = 'c1d2e3f4-a5b6-7890-cdef-ab1234567890';