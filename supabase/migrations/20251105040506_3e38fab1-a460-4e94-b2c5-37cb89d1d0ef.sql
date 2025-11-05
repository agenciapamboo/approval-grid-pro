-- Allow super admins to view and edit any profile
-- Create SELECT policy for super admins on profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create UPDATE policy for super admins on profiles
CREATE POLICY "Super admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));