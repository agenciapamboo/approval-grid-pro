-- Fase 2: Limpar Roles Duplicadas
-- Objetivo: Garantir que cada usuário tenha apenas 1 role principal

-- 1. Logar todos os usuários com múltiplas roles antes da limpeza (para auditoria)
INSERT INTO activity_log (entity, action, metadata, created_at)
SELECT 
  'user_roles',
  'duplicate_roles_cleanup',
  jsonb_build_object(
    'user_id', user_id,
    'roles', array_agg(role::text),
    'role_count', count(*)
  ),
  now()
FROM user_roles
GROUP BY user_id
HAVING count(*) > 1;

-- 2. Remover role 'approver' de usuários que já têm 'agency_admin'
-- (agency_admin deve ter todas as permissões necessárias via role_permissions)
DELETE FROM user_roles
WHERE role = 'approver'
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'agency_admin'
);

-- 3. Remover role 'approver' de usuários que já têm 'client_user'
-- (client_user é a role principal para clientes)
DELETE FROM user_roles
WHERE role = 'approver'
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'client_user'
);

-- 4. Garantir que nenhum usuário ficou sem role (adicionar client_user como fallback)
-- Primeiro, identificar usuários sem role
INSERT INTO user_roles (user_id, role, created_by)
SELECT DISTINCT p.id, 'client_user'::app_role, p.id
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Logar resultado da limpeza
INSERT INTO activity_log (entity, action, metadata, created_at)
SELECT 
  'user_roles',
  'cleanup_completed',
  jsonb_build_object(
    'total_users', count(DISTINCT user_id),
    'users_with_single_role', count(DISTINCT user_id) FILTER (WHERE role_count = 1),
    'users_with_multiple_roles', count(DISTINCT user_id) FILTER (WHERE role_count > 1)
  ),
  now()
FROM (
  SELECT user_id, count(*) as role_count
  FROM user_roles
  GROUP BY user_id
) role_counts;