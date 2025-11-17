-- Enable RLS policies for kanban_columns table
-- Allow users to view global columns (agency_id IS NULL) and their agency's columns
CREATE POLICY "Users can view global and agency columns"
ON kanban_columns
FOR SELECT
TO authenticated
USING (
  agency_id IS NULL 
  OR agency_id = get_user_agency_id(auth.uid())
);

-- Allow agency admins to create custom columns for their agency
CREATE POLICY "Agency admins can create custom columns"
ON kanban_columns
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agency_admin'::app_role)
  AND agency_id = get_user_agency_id(auth.uid())
  AND is_system = false
);

-- Allow agency admins to update non-system columns for their agency
CREATE POLICY "Agency admins can update custom columns"
ON kanban_columns
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin'::app_role)
  AND agency_id = get_user_agency_id(auth.uid())
  AND is_system = false
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin'::app_role)
  AND agency_id = get_user_agency_id(auth.uid())
  AND is_system = false
);

-- Allow agency admins to delete non-system columns for their agency
CREATE POLICY "Agency admins can delete custom columns"
ON kanban_columns
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin'::app_role)
  AND agency_id = get_user_agency_id(auth.uid())
  AND is_system = false
);