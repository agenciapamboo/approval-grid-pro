-- Script SQL para criar dados de teste do sistema de assinaturas
-- Execute este script em um ambiente de teste separado

-- ==========================================
-- 1. Criar usuários de teste na tabela auth.users
-- ==========================================

-- Usuário interno (skip_subscription_check = true)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'internal@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário em período de carência ativo
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'grace-period@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário com período de carência expirado
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'expired-grace@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário com assinatura cancelada (sem inadimplência)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'canceled@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário normal (eugencia plan)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'user@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Agency admin
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'admin@agency.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Team member bloqueado
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'blocked-member@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário próximo do limite de posts
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  'limit-test@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Usuário no limite de storage
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000009',
  'storage-limit@test.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- ==========================================
-- 2. Criar perfis de teste
-- ==========================================

-- Perfil: Usuário interno
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, delinquent, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Internal Test User',
  'unlimited',
  true,
  true,
  false,
  null
);

-- Perfil: Usuário em período de carência
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, delinquent, grace_period_end, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Grace Period User',
  'eugencia',
  false,
  true,
  true,
  now() + interval '3 days',
  'past_due'
);

-- Perfil: Usuário com grace expirado
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, delinquent, grace_period_end, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Expired Grace User',
  'eugencia',
  false,
  true,
  true,
  now() - interval '1 day',
  'past_due'
);

-- Perfil: Usuário cancelado
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, delinquent, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Canceled User',
  'creator',
  false,
  false,
  false,
  'canceled'
);

-- Perfil: Usuário normal
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Normal User',
  'eugencia',
  false,
  true,
  'active'
);

-- Criar agency para testes de team members
INSERT INTO agencies (id, name, plan, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Test Agency',
  'socialmidia',
  now(),
  now()
);

-- Perfil: Agency admin
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, subscription_status, agency_id)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Agency Admin',
  'socialmidia',
  false,
  true,
  'active',
  '00000000-0000-0000-0000-000000000010'
);

-- Perfil: Team member bloqueado
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, blocked_by_parent, agency_id)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'Blocked Team Member',
  'socialmidia',
  false,
  false,
  true,
  '00000000-0000-0000-0000-000000000010'
);

-- Criar cliente para testes de limites
INSERT INTO clients (id, name, slug, agency_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'Test Client Limits',
  'test-client-limits',
  '00000000-0000-0000-0000-000000000010',
  now(),
  now()
);

-- Perfil: Usuário próximo do limite de posts
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, subscription_status, client_id)
VALUES (
  '00000000-0000-0000-0000-000000000008',
  'Limit Test User',
  'eugencia',
  false,
  true,
  'active',
  '00000000-0000-0000-0000-000000000011'
);

-- Perfil: Usuário no limite de storage
INSERT INTO profiles (id, name, plan, skip_subscription_check, is_pro, subscription_status, client_id)
VALUES (
  '00000000-0000-0000-0000-000000000009',
  'Storage Limit User',
  'eugencia',
  false,
  true,
  'active',
  '00000000-0000-0000-0000-000000000011'
);

-- ==========================================
-- 3. Criar roles de teste
-- ==========================================

INSERT INTO user_roles (user_id, role, created_by)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'super_admin', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'client_user', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003', 'client_user', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004', 'client_user', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005', 'client_user', '00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006', 'agency_admin', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000007', 'team_member', '00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000008', 'client_user', '00000000-0000-0000-0000-000000000008'),
  ('00000000-0000-0000-0000-000000000009', 'client_user', '00000000-0000-0000-0000-000000000009');

-- ==========================================
-- 4. Criar conteúdos de teste para limites
-- ==========================================

-- Criar 49 posts para usuário próximo do limite (limite é 50)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..49 LOOP
    INSERT INTO contents (
      client_id,
      owner_user_id,
      title,
      type,
      status,
      date,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000008',
      'Test Post ' || i,
      'post',
      'draft',
      date_trunc('month', CURRENT_DATE) + (i || ' days')::interval,
      now(),
      now()
    );
  END LOOP;
END $$;

-- Criar 100 criativos para usuário no limite de storage (limite é 100)
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO contents (
      client_id,
      owner_user_id,
      title,
      type,
      status,
      date,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000009',
      'Creative ' || i,
      'creative',
      'draft',
      CURRENT_DATE - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      now()
    );
  END LOOP;
END $$;

-- ==========================================
-- 5. Script de limpeza
-- ==========================================

-- Para limpar os dados de teste, execute:
/*
DELETE FROM contents WHERE client_id = '00000000-0000-0000-0000-000000000011';
DELETE FROM user_roles WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009'
);
DELETE FROM profiles WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009'
);
DELETE FROM clients WHERE id = '00000000-0000-0000-0000-000000000011';
DELETE FROM agencies WHERE id = '00000000-0000-0000-0000-000000000010';
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000009'
);
*/
