-- Fix RLS policies for client_user permissions and add client configuration fields

-- 1. Allow client_users to approve/update their own contents
CREATE POLICY "client_users_can_update_their_contents"
  ON public.contents FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_user'::app_role)
    AND client_id = get_user_client_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'client_user'::app_role)
    AND client_id = get_user_client_id(auth.uid())
  );

-- 2. Allow authenticated users to view comments on their accessible contents
CREATE POLICY "Users can view comments of their accessible contents"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contents c
      JOIN public.profiles p ON (
        p.client_id = c.client_id 
        OR EXISTS (
          SELECT 1 FROM public.clients cl 
          WHERE cl.id = c.client_id 
          AND cl.agency_id = p.agency_id
        )
      )
      WHERE c.id = comments.content_id 
      AND p.id = auth.uid()
    )
  );

-- 3. Allow authenticated users to create platform notifications
CREATE POLICY "Authenticated users can create platform notifications"
  ON public.platform_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR created_by IS NULL
  );

-- 4. Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.platform_notifications
  FOR DELETE
  TO authenticated
  USING (
    (target_type = 'all') 
    OR (target_id = auth.uid())
    OR (target_type = 'agency' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.agency_id = platform_notifications.target_id
    ))
    OR (target_type = 'client_user' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.client_id = platform_notifications.target_id
    ))
    OR (target_type = 'creator' AND target_id = auth.uid())
    OR (target_type = 'team_member' AND target_id = auth.uid())
  );

-- 5. Allow authenticated users to create job request notifications
CREATE POLICY "Authenticated users can create job notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event = 'novojob'
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.client_id = notifications.client_id
      )
    )
  );

-- 6. Allow users to view their job requests
CREATE POLICY "Users can view their job requests"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    event = 'novojob'
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.client_id = notifications.client_id
      )
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = notifications.client_id
        AND c.agency_id = get_user_agency_id(auth.uid())
      )
    )
  );

-- 7. Allow client users to update their own client data
CREATE POLICY "Client users can update their own client data"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_user'::app_role)
    AND id = get_user_client_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'client_user'::app_role)
    AND id = get_user_client_id(auth.uid())
  );

-- 8. Add configuration fields to clients table for overage messages
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS show_overage_message BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS overage_message_template TEXT DEFAULT 'Fale com sua {contact_type} para regularizar sua situação.';