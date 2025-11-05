-- Create function to automatically assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert role based on account_type or default to client_user
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.account_type = 'creator' THEN 'client_user'::app_role
      WHEN NEW.account_type = 'agency' THEN 'agency_admin'::app_role
      ELSE 'client_user'::app_role
    END,
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to assign role after profile update
DROP TRIGGER IF EXISTS on_profile_account_type_set ON public.profiles;
CREATE TRIGGER on_profile_account_type_set
  AFTER UPDATE OF account_type ON public.profiles
  FOR EACH ROW
  WHEN (OLD.account_type IS NULL AND NEW.account_type IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user_signup();

-- Fix existing creator account that doesn't have a role
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT p.id, 'client_user'::app_role, p.id
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.account_type = 'creator' 
  AND ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;