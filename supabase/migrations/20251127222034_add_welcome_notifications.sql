-- Migration: Adicionar notificações de boas-vindas para novas contas
-- Esta migration adiciona triggers para criar notificações quando:
-- 1. Nova conta de agência é criada (via signup)
-- 2. Remove duplicação do trigger de aprovador (já criado no frontend)

-- =====================================================
-- 1. Trigger para notificar criação de nova conta de agência
-- =====================================================

CREATE OR REPLACE FUNCTION notify_new_agency_account()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id UUID;
  v_agency_name TEXT;
  v_user_role TEXT;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Apenas processar se o profile foi criado com agency_id (nova conta de agência)
  -- E se o profile ainda não tem client_id (não é cliente)
  IF NEW.agency_id IS NOT NULL AND NEW.client_id IS NULL THEN
    -- Buscar informações da agência
    SELECT id, name INTO v_agency_id, v_agency_name
    FROM agencies
    WHERE id = NEW.agency_id
    LIMIT 1;

    -- Buscar informações do usuário
    SELECT email, raw_user_meta_data->>'name' INTO v_user_email, v_user_name
    FROM auth.users
    WHERE id = NEW.id
    LIMIT 1;

    -- Determinar role
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = NEW.id
    LIMIT 1;

    -- Apenas criar notificação se for agency_admin (nova conta)
    IF v_user_role = 'agency_admin' AND v_agency_id IS NOT NULL THEN
      -- Criar notificação de boas-vindas
      -- Nota: A senha não está disponível aqui pois é criada via signup
      -- Será necessário resetar senha ou enviar link de ativação
      INSERT INTO notifications (
        event,
        content_id,
        client_id,
        agency_id,
        user_id,
        channel,
        status,
        payload
      ) VALUES (
        'user.account_created',
        NULL,
        NULL,
        v_agency_id,
        NEW.id,
        'webhook',
        'pending',
        jsonb_build_object(
          'user', jsonb_build_object(
            'id', NEW.id,
            'email', COALESCE(v_user_email, ''),
            'name', COALESCE(v_user_name, NEW.name, ''),
            'role', 'agency_admin',
            'account_type', COALESCE(NEW.account_type, 'agency'),
            'password', NULL -- Senha não disponível no trigger
          ),
          'client', NULL,
          'agency', jsonb_build_object(
            'id', v_agency_id,
            'name', COALESCE(v_agency_name, 'Nova Agência')
          ),
          'login_url', COALESCE(
            (SELECT value FROM system_settings WHERE key = 'site_url' LIMIT 1),
            'https://app.exemplo.com'
          ) || '/auth',
          'created_at', NEW.created_at
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para profiles (após INSERT, mas apenas para novos registros)
DROP TRIGGER IF EXISTS trigger_notify_new_agency_account ON profiles;
CREATE TRIGGER trigger_notify_new_agency_account
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.agency_id IS NOT NULL AND NEW.client_id IS NULL)
  EXECUTE FUNCTION notify_new_agency_account();

-- =====================================================
-- 2. Desabilitar trigger antigo de aprovador para evitar duplicação
-- O frontend agora cria a notificação com a senha incluída
-- =====================================================

DROP TRIGGER IF EXISTS trigger_notify_new_approver ON client_approvers;

-- Manter a função para possível uso futuro, mas sem trigger automático
-- CREATE OR REPLACE FUNCTION notify_new_approver()
-- ... mantém a função mas não cria notificação via trigger

COMMENT ON FUNCTION notify_new_agency_account() IS 'Cria notificação de boas-vindas quando uma nova conta de agência é criada via signup';
COMMENT ON TRIGGER trigger_notify_new_agency_account ON profiles IS 'Dispara notificação de boas-vindas para novas contas de agência';
