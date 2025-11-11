-- Script para corrigir usuário Cintia Souza
-- Este script cria uma function que pode ser chamada do admin para corrigir usuários órfãos

CREATE OR REPLACE FUNCTION fix_orphaned_user(
  p_user_id UUID,
  p_agency_name TEXT,
  p_agency_email TEXT,
  p_agency_whatsapp TEXT,
  p_plan TEXT,
  p_plan_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
  v_agency_slug TEXT;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Gerar slug da agência
  v_agency_slug := lower(regexp_replace(p_agency_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_agency_slug := trim(both '-' from v_agency_slug);

  -- Verificar se agência já existe com este slug
  SELECT id INTO v_agency_id
  FROM agencies
  WHERE slug = v_agency_slug
  LIMIT 1;

  -- Se não existe, criar agência
  IF v_agency_id IS NULL THEN
    INSERT INTO agencies (name, slug, email, whatsapp, plan, plan_type)
    VALUES (p_agency_name, v_agency_slug, p_agency_email, p_agency_whatsapp, p_plan, p_plan_type)
    RETURNING id INTO v_agency_id;
  END IF;

  -- Atualizar profile do usuário
  UPDATE profiles
  SET 
    agency_id = v_agency_id,
    role = 'agency_admin',
    agency_name = p_agency_name,
    plan = p_plan,
    billing_cycle = p_plan_type,
    updated_at = now()
  WHERE id = p_user_id;

  -- Inserir role agency_admin se não existir
  INSERT INTO user_roles (user_id, role, created_by)
  VALUES (p_user_id, 'agency_admin', p_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Registrar no log de atividades
  INSERT INTO activity_log (entity, action, entity_id, actor_user_id, metadata)
  VALUES (
    'user',
    'orphan_fixed',
    p_user_id,
    auth.uid(),
    jsonb_build_object(
      'agency_id', v_agency_id,
      'agency_name', p_agency_name,
      'plan', p_plan
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'agency_name', p_agency_name,
    'message', 'Usuário corrigido com sucesso'
  );
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION fix_orphaned_user IS 'Corrige usuários órfãos criando agência e atualizando roles. Uso: SELECT fix_orphaned_user(user_id, agency_name, email, whatsapp, plan, plan_type);';
