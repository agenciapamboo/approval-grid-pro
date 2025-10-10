
-- Remove all related triggers and function with CASCADE
DROP TRIGGER IF EXISTS enforce_profile_security ON profiles;
DROP TRIGGER IF EXISTS prevent_profile_escalation ON profiles;
DROP FUNCTION IF EXISTS prevent_profile_escalation() CASCADE;

-- Make the necessary changes
DELETE FROM user_roles 
WHERE user_id = 'cf271e35-4584-42ad-bc1e-f3cf9df3e887' 
AND role = 'agency_admin';

INSERT INTO user_roles (user_id, role) 
VALUES ('cf271e35-4584-42ad-bc1e-f3cf9df3e887', 'client_user')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE profiles 
SET 
  role = 'client_user',
  client_id = 'aa79dfbd-21c8-4b5f-b94b-09343aa2803a',
  agency_id = NULL
WHERE id = 'cf271e35-4584-42ad-bc1e-f3cf9df3e887';

-- Recreate the security function
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only super admins can change roles, agency_id, or client_id
  IF (OLD.role IS DISTINCT FROM NEW.role 
      OR OLD.agency_id IS DISTINCT FROM NEW.agency_id 
      OR OLD.client_id IS DISTINCT FROM NEW.client_id)
  THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only super admins can modify roles or assignments';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_escalation();
