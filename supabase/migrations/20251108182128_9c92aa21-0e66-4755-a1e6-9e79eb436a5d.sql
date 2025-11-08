-- Etapa 1B: Adicionar plano unlimited e função helper

-- 1. Remover constraint de check no plano (se existir) para permitir novos valores
ALTER TABLE plan_entitlements DROP CONSTRAINT IF EXISTS plan_entitlements_plan_check;

-- 2. Adicionar plano 'unlimited' (para equipe interna/sem plano)
INSERT INTO plan_entitlements (
  plan,
  posts_limit,
  creatives_limit,
  history_days,
  team_members_limit,
  whatsapp_support,
  graphics_approval,
  supplier_link,
  global_agenda,
  team_kanban,
  team_notifications
) VALUES (
  'unlimited',
  NULL, -- sem limite de posts
  NULL, -- sem limite de criativos
  365, -- 1 ano de histórico
  NULL, -- sem limite de membros
  true,
  true,
  true,
  true,
  true,
  true
) ON CONFLICT (plan) DO NOTHING;

-- 3. Criar função helper para verificar se usuário é team_member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'team_member'
  )
$$;