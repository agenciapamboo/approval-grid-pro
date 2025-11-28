-- Adiciona função e trigger para notificações de boas-vindas

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_notify_new_approver ON public.profiles;

-- Cria função para notificar quando nova conta de agência é criada
CREATE OR REPLACE FUNCTION notify_new_agency_account()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_agency_name TEXT;
  v_user_email TEXT;
BEGIN
  -- Buscar informações da agência e email do usuário
  SELECT a.name, au.email
  INTO v_agency_name, v_user_email
  FROM agencies a
  CROSS JOIN auth.users au
  WHERE a.id = NEW.agency_id
    AND au.id = NEW.id;

  -- Se for uma conta de agência (não cliente), criar notificação de boas-vindas
  IF NEW.agency_id IS NOT NULL AND NEW.client_id IS NULL THEN
    INSERT INTO notifications (
      event,
      user_id,
      agency_id,
      channel,
      status,
      payload
    ) VALUES (
      'user.account_created',
      NEW.id,
      NEW.agency_id,
      'email',
      'pending',
      jsonb_build_object(
        'user_id', NEW.id,
        'user_email', v_user_email,
        'user_name', NEW.name,
        'agency_id', NEW.agency_id,
        'agency_name', v_agency_name,
        'account_type', 'agency',
        'created_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Cria trigger para profiles (quando uma nova conta é criada)
CREATE TRIGGER trigger_notify_new_agency_account
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_agency_account();