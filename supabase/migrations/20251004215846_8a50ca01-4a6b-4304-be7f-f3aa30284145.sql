-- Phase 1: Critical Security Fixes

-- Step 1: Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'agency_admin', 'client_user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Create security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'agency_admin' THEN 2
    WHEN 'client_user' THEN 3
  END
  LIMIT 1
$$;

-- Step 6: RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Step 7: Create trigger function to prevent unauthorized profile changes
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger on profiles table
CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_escalation();

-- Step 8: Update profiles RLS policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Step 9: Fix existing database functions - add search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'client_user'
  );
  
  -- Insert default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client_user');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_agency_admin_email(agency_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT au.email
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.agency_id = agency_id_param
    AND ur.role = 'agency_admin'
  LIMIT 1;
$function$;

-- Step 10: Update ALL RLS policies to use has_role()

-- Agencies policies
DROP POLICY IF EXISTS "Agency admins can update their agency" ON public.agencies;
DROP POLICY IF EXISTS "Super admins can update agencies" ON public.agencies;
DROP POLICY IF EXISTS "Super admins can view all agencies" ON public.agencies;

CREATE POLICY "Agency admins can update their agency"
ON public.agencies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = agencies.id
    AND public.has_role(auth.uid(), 'agency_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = agencies.id
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

CREATE POLICY "Super admins can update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Clients policies
DROP POLICY IF EXISTS "Agency admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Agency admins can update their clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can view all clients" ON public.clients;

CREATE POLICY "Agency admins can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

CREATE POLICY "Agency admins can update their clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND public.has_role(auth.uid(), 'agency_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.agency_id = clients.agency_id
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

CREATE POLICY "Super admins can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Client notes policies
DROP POLICY IF EXISTS "Agency admins can insert client notes" ON public.client_notes;

CREATE POLICY "Agency admins can insert client notes"
ON public.client_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = client_notes.client_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

-- Comments policies
DROP POLICY IF EXISTS "Agency admins can delete comments on their clients' contents" ON public.comments;

CREATE POLICY "Agency admins can delete comments on their clients' contents"
ON public.comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM contents c
    JOIN clients cl ON cl.id = c.client_id
    JOIN profiles p ON p.agency_id = cl.agency_id
    WHERE c.id = comments.content_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

-- Content media policies
DROP POLICY IF EXISTS "Agency admins can delete content media" ON public.content_media;
DROP POLICY IF EXISTS "Agency admins can update content media" ON public.content_media;

CREATE POLICY "Agency admins can delete content media"
ON public.content_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM contents co
    JOIN clients c ON c.id = co.client_id
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE co.id = content_media.content_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

CREATE POLICY "Agency admins can update content media"
ON public.content_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM contents co
    JOIN clients c ON c.id = co.client_id
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE co.id = content_media.content_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

-- Contents policies
DROP POLICY IF EXISTS "Agency admins can delete contents" ON public.contents;

CREATE POLICY "Agency admins can delete contents"
ON public.contents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
    AND c.id = contents.client_id
  )
);

-- Webhook events policies
DROP POLICY IF EXISTS "Agency admins can view their webhook events" ON public.webhook_events;

CREATE POLICY "Agency admins can view their webhook events"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = webhook_events.client_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'agency_admin')
  )
);

-- LGPD pages policies
DROP POLICY IF EXISTS "Super admins can manage LGPD pages" ON public.lgpd_pages;

CREATE POLICY "Super admins can manage LGPD pages"
ON public.lgpd_pages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));