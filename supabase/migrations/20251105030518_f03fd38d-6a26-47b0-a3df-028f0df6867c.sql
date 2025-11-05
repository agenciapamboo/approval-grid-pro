-- Modify prevent_profile_escalation to allow system updates
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow system updates (when auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
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

-- Now update the data
-- Update criacao@pamboo.com.br 
UPDATE profiles
SET plan = 'creator', account_type = 'creator'
WHERE id = '9df1c2f2-34f1-4d0f-bd58-4f5e968afa51';

UPDATE user_roles
SET role = 'client_user'
WHERE user_id = '9df1c2f2-34f1-4d0f-bd58-4f5e968afa51';

-- Create/update agency
INSERT INTO agencies (id, name, slug, plan, created_at, updated_at)
VALUES (gen_random_uuid(), 'Pamboo Criativos', 'pamboo-criativos', 'unlimited', now(), now())
ON CONFLICT (slug) DO UPDATE SET plan = 'unlimited', updated_at = now();

-- Update contato@pamboo.com.br
UPDATE profiles
SET plan = 'unlimited',
    account_type = 'agency',
    agency_id = (SELECT id FROM agencies WHERE slug = 'pamboo-criativos' LIMIT 1)
WHERE id = '208cdada-a648-4d66-8fe3-eaf1dabe27dd';

UPDATE user_roles
SET role = 'agency_admin'
WHERE user_id = '208cdada-a648-4d66-8fe3-eaf1dabe27dd';