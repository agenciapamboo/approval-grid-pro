-- Update the handle_new_user function to create users with agency_admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'agency_admin'
  );
  
  -- Insert agency_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agency_admin');
  
  RETURN NEW;
END;
$function$;