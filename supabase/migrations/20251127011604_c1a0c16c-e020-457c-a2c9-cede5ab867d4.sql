
-- Fix Security Definer View Issue
-- The client_social_accounts_decrypted view bypasses RLS by using SECURITY DEFINER functions

-- Step 1: Add proper RLS policies to the base table
-- Super admin can see all social accounts
CREATE POLICY "super_admin_select_client_social_accounts" ON public.client_social_accounts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admin can see social accounts for their agency's clients
CREATE POLICY "agency_admin_select_client_social_accounts" ON public.client_social_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

-- Client users can see their own client's social accounts
CREATE POLICY "client_user_select_client_social_accounts" ON public.client_social_accounts
FOR SELECT
TO authenticated
USING (
  client_id = get_user_client_id(auth.uid())
);

-- Step 2: Drop the insecure view
-- Users should query the base table and call decrypt_social_token() when needed
DROP VIEW IF EXISTS public.client_social_accounts_decrypted;

-- Step 3: Add INSERT/UPDATE/DELETE policies for completeness
-- Super admin can manage all social accounts
CREATE POLICY "super_admin_insert_client_social_accounts" ON public.client_social_accounts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_update_client_social_accounts" ON public.client_social_accounts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_delete_client_social_accounts" ON public.client_social_accounts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admin can manage social accounts for their clients
CREATE POLICY "agency_admin_insert_client_social_accounts" ON public.client_social_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "agency_admin_update_client_social_accounts" ON public.client_social_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "agency_admin_delete_client_social_accounts" ON public.client_social_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_social_accounts.client_id
      AND c.agency_id = get_user_agency_id(auth.uid())
  )
);
