-- Drop views obsoletas do sistema de autenticação por tokens
DROP VIEW IF EXISTS public.clients_public CASCADE;
DROP VIEW IF EXISTS public.clients_secure CASCADE;
DROP VIEW IF EXISTS public.agencies_public CASCADE;
DROP VIEW IF EXISTS public.agencies_secure CASCADE;

-- Log da remoção
INSERT INTO activity_log (entity, action, metadata)
VALUES (
  'database',
  'remove_token_auth_views',
  jsonb_build_object(
    'reason', 'Sistema de autenticação por tokens foi removido',
    'views_removed', ARRAY['clients_public', 'clients_secure', 'agencies_public', 'agencies_secure'],
    'replaced_by', 'Acesso direto às tabelas com RLS'
  )
);