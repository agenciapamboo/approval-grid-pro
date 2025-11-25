-- ========================================
-- FASE 1: CORREÇÃO CRÍTICA DE PERMISSÕES RLS
-- ========================================

-- 1. CORREÇÃO: clients table - agency_admin UPDATE com WITH CHECK
DROP POLICY IF EXISTS "Agency admins can update their clients" ON public.clients;

CREATE POLICY "Agency admins can update their clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
);

-- 2. CORREÇÃO: contents table - agency_admin e team_member UPDATE
DROP POLICY IF EXISTS "Agency admins can update contents" ON public.contents;
DROP POLICY IF EXISTS "Team members can update contents" ON public.contents;

CREATE POLICY "Agency admins can update contents"
ON public.contents
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'agency_admin'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agency_admin'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "Team members can update contents"
ON public.contents
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'team_member'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'team_member'::app_role) 
  AND agency_id = get_user_agency_id(auth.uid())
);

-- 3. SIMPLIFICAÇÃO: content_texts policies
DROP POLICY IF EXISTS "Users can insert content texts for accessible contents" ON public.content_texts;
DROP POLICY IF EXISTS "Users can update content texts for accessible contents" ON public.content_texts;
DROP POLICY IF EXISTS "Users can delete content texts for accessible contents" ON public.content_texts;

CREATE POLICY "Agency and team can insert content texts"
ON public.content_texts
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can insert their content texts"
ON public.content_texts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Agency and team can update content texts"
ON public.content_texts
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can update their content texts"
ON public.content_texts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Agency and team can delete content texts"
ON public.content_texts
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can delete their content texts"
ON public.content_texts
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);

-- 4. SIMPLIFICAÇÃO: content_media policies
DROP POLICY IF EXISTS "Users can insert media for accessible contents" ON public.content_media;
DROP POLICY IF EXISTS "Users can update media for accessible contents" ON public.content_media;
DROP POLICY IF EXISTS "Users can delete media for accessible contents" ON public.content_media;

CREATE POLICY "Agency and team can insert media"
ON public.content_media
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can insert their media"
ON public.content_media
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Agency and team can update media"
ON public.content_media
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can update their media"
ON public.content_media
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Agency and team can delete media"
ON public.content_media
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'agency_admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role))
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.agency_id = get_user_agency_id(auth.uid())
  )
);

CREATE POLICY "Client users can delete their media"
ON public.content_media
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'client_user'::app_role)
  AND EXISTS (
    SELECT 1 FROM contents c
    WHERE c.id = content_id
    AND c.client_id = get_user_client_id(auth.uid())
  )
);
