-- Update handle_new_user to automatically create an agency for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_agency_id uuid;
  user_name text;
BEGIN
  -- Get the user's name, fallback to email
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  -- Create a new agency for this user
  INSERT INTO public.agencies (name, slug, email)
  VALUES (
    user_name || ' - Agência',
    lower(replace(user_name, ' ', '-')) || '-' || substring(NEW.id::text, 1, 8),
    NEW.email
  )
  RETURNING id INTO new_agency_id;
  
  -- Create the profile with agency_admin role and link to the new agency
  INSERT INTO public.profiles (id, name, role, agency_id)
  VALUES (
    NEW.id,
    user_name,
    'agency_admin',
    new_agency_id
  );
  
  -- Insert agency_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agency_admin');
  
  RETURN NEW;
END;
$function$;