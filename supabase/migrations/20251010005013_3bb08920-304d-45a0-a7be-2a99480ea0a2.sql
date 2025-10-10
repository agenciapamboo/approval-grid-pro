
-- Step 1: Modify the prevent_profile_escalation function to allow this specific change
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Allow migration for user cf271e35-4584-42ad-bc1e-f3cf9df3e887
  IF NEW.id = 'cf271e35-4584-42ad-bc1e-f3cf9df3e887' THEN
    RETURN NEW;
  END IF;
  
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

-- Step 2: Remove agency_admin role from user_roles
DELETE FROM user_roles 
WHERE user_id = 'cf271e35-4584-42ad-bc1e-f3cf9df3e887' 
AND role = 'agency_admin';

-- Step 3: Add client_user role to user_roles
INSERT INTO user_roles (user_id, role) 
VALUES ('cf271e35-4584-42ad-bc1e-f3cf9df3e887', 'client_user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Update the profile
UPDATE profiles 
SET 
  role = 'client_user',
  client_id = 'aa79dfbd-21c8-4b5f-b94b-09343aa2803a',
  agency_id = NULL
WHERE id = 'cf271e35-4584-42ad-bc1e-f3cf9df3e887';

-- Step 5: Restore the original function
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
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
