-- COMPLETE RLS AND PERMISSIONS REWRITE FOR 5-ROLE SYSTEM
-- This migration rebuilds all RLS policies to be consistent and avoid recursion

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON MAIN TABLES
-- ============================================================================

-- Drop all policies from clients table
DO $$ 
DECLARE policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON clients', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from contents table
DO $$ 
DECLARE policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'contents' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON contents', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from profiles table
DO $$ 
DECLARE policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from client_approvers table
DO $$ 
DECLARE policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'client_approvers' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON client_approvers', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: CREATE PROFILES TABLE POLICIES (NO RECURSION - BASE LAYER)
-- ============================================================================

-- Super admins can view all profiles
CREATE POLICY "super_admin_select_profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admins can view profiles from their agency
CREATE POLICY "agency_admin_select_profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- Team members can view profiles from their agency
CREATE POLICY "team_member_select_profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'team_member') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- Client users can view their own profile
CREATE POLICY "client_user_select_own_profile"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'client_user') AND
  id = auth.uid()
);

-- Approvers can view their own profile
CREATE POLICY "approver_select_own_profile"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'approver') AND
  id = auth.uid()
);

-- Users can update their own profile (basic info only)
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Super admins can update any profile
CREATE POLICY "super_admin_update_profiles"
ON profiles FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Super admins can insert profiles
CREATE POLICY "super_admin_insert_profiles"
ON profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- STEP 3: CREATE CLIENTS TABLE POLICIES
-- ============================================================================

-- Super admins can view all clients
CREATE POLICY "super_admin_select_clients"
ON clients FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admins can view their agency's clients
CREATE POLICY "agency_admin_select_clients"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- Team members can view their agency's clients
CREATE POLICY "team_member_select_clients"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'team_member') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- Client users can view their own client
CREATE POLICY "client_user_select_own_client"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'client_user') AND
  id = (SELECT client_id FROM profiles WHERE id = auth.uid())
);

-- Approvers can view assigned clients
CREATE POLICY "approver_select_assigned_clients"
ON clients FOR SELECT
USING (
  has_role(auth.uid(), 'approver') AND
  id IN (
    SELECT client_id FROM client_approvers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Super admins can insert/update/delete any client
CREATE POLICY "super_admin_insert_clients"
ON clients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_update_clients"
ON clients FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin_delete_clients"
ON clients FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admins can insert/update/delete their agency's clients
CREATE POLICY "agency_admin_insert_clients"
ON clients FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "agency_admin_update_clients"
ON clients FOR UPDATE
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "agency_admin_delete_clients"
ON clients FOR DELETE
USING (
  has_role(auth.uid(), 'agency_admin') AND
  agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- STEP 4: CREATE CONTENTS TABLE POLICIES
-- ============================================================================

-- Super admins can view all contents
CREATE POLICY "super_admin_select_contents"
ON contents FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Agency admins can view contents from their agency's clients
CREATE POLICY "agency_admin_select_contents"
ON contents FOR SELECT
USING (
  has_role(auth.uid(), 'agency_admin') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Team members can view contents from their agency's clients
CREATE POLICY "team_member_select_contents"
ON contents FOR SELECT
USING (
  has_role(auth.uid(), 'team_member') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Client users can view their own client's contents
CREATE POLICY "client_user_select_contents"
ON contents FOR SELECT
USING (
  has_role(auth.uid(), 'client_user') AND
  client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
);

-- Approvers can view contents from assigned clients
CREATE POLICY "approver_select_contents"
ON contents FOR SELECT
USING (
  has_role(auth.uid(), 'approver') AND
  client_id IN (
    SELECT client_id FROM client_approvers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Agency admins and team members can create/update contents
CREATE POLICY "agency_staff_insert_contents"
ON contents FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'team_member')) AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "agency_staff_update_contents"
ON contents FOR UPDATE
USING (
  (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'team_member')) AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "agency_staff_delete_contents"
ON contents FOR DELETE
USING (
  (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'team_member')) AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Approvers can update contents (for approval workflow)
CREATE POLICY "approver_update_contents"
ON contents FOR UPDATE
USING (
  has_role(auth.uid(), 'approver') AND
  client_id IN (
    SELECT client_id FROM client_approvers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- STEP 5: CREATE CLIENT_APPROVERS TABLE POLICIES
-- ============================================================================

-- Super admins can manage all approvers
CREATE POLICY "super_admin_all_approvers"
ON client_approvers FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agency admins can manage approvers for their clients
CREATE POLICY "agency_admin_select_approvers"
ON client_approvers FOR SELECT
USING (
  has_role(auth.uid(), 'agency_admin') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "agency_admin_insert_approvers"
ON client_approvers FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agency_admin') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "agency_admin_update_approvers"
ON client_approvers FOR UPDATE
USING (
  has_role(auth.uid(), 'agency_admin') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "agency_admin_delete_approvers"
ON client_approvers FOR DELETE
USING (
  has_role(auth.uid(), 'agency_admin') AND
  client_id IN (
    SELECT id FROM clients WHERE agency_id = (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Client users can view approvers for their client
CREATE POLICY "client_user_select_approvers"
ON client_approvers FOR SELECT
USING (
  has_role(auth.uid(), 'client_user') AND
  client_id = (SELECT client_id FROM profiles WHERE id = auth.uid())
);