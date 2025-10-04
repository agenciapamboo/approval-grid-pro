-- Phase 1: Critical Data Exposure Fixes

-- 1. Fix activity_log RLS policy to filter by user's agency/client context
DROP POLICY IF EXISTS "Users can view activity log for their context" ON public.activity_log;

CREATE POLICY "Users can view activity log for their context"
ON public.activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Super admins can see all activity
      has_role(auth.uid(), 'super_admin')
      OR
      -- Agency admins can see activity for their agency's clients
      (
        has_role(auth.uid(), 'agency_admin')
        AND activity_log.entity IN ('client', 'content', 'agency')
        AND (
          (activity_log.entity = 'agency' AND activity_log.entity_id = p.agency_id)
          OR
          (activity_log.entity = 'client' AND EXISTS (
            SELECT 1 FROM clients c WHERE c.id = activity_log.entity_id AND c.agency_id = p.agency_id
          ))
          OR
          (activity_log.entity = 'content' AND EXISTS (
            SELECT 1 FROM contents co
            JOIN clients c ON c.id = co.client_id
            WHERE co.id = activity_log.entity_id AND c.agency_id = p.agency_id
          ))
        )
      )
      OR
      -- Client users can see activity for their own client
      (
        has_role(auth.uid(), 'client_user')
        AND activity_log.entity IN ('client', 'content')
        AND (
          (activity_log.entity = 'client' AND activity_log.entity_id = p.client_id)
          OR
          (activity_log.entity = 'content' AND EXISTS (
            SELECT 1 FROM contents co WHERE co.id = activity_log.entity_id AND co.client_id = p.client_id
          ))
        )
      )
    )
  )
);

-- 2. Fix set_agency_renewal_date function to include proper search_path protection
CREATE OR REPLACE FUNCTION public.set_agency_renewal_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Base date: prefer last_payment_date, fallback to existing plan_renewal_date, then created_at, then now()
  IF NEW.last_payment_date IS NOT NULL THEN
    NEW.plan_renewal_date := CASE
      WHEN NEW.plan_type = 'monthly' THEN NEW.last_payment_date + INTERVAL '1 month'
      WHEN NEW.plan_type = 'annual' THEN NEW.last_payment_date + INTERVAL '1 year'
      ELSE NULL
    END;
  ELSE
    -- if no last payment, use current plan_renewal_date as base or created_at
    IF NEW.plan_type = 'monthly' THEN
      NEW.plan_renewal_date := COALESCE(NEW.plan_renewal_date, NEW.created_at, now()) + INTERVAL '1 month';
    ELSIF NEW.plan_type = 'annual' THEN
      NEW.plan_renewal_date := COALESCE(NEW.plan_renewal_date, NEW.created_at, now()) + INTERVAL '1 year';
    ELSE
      NEW.plan_renewal_date := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Add webhook payload sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_webhook_payload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  sanitized jsonb;
  sensitive_keys text[] := ARRAY['password', 'token', 'secret', 'api_key', 'private_key', 'auth'];
  key text;
BEGIN
  sanitized := payload;
  
  -- Remove sensitive keys from the payload
  FOREACH key IN ARRAY sensitive_keys
  LOOP
    sanitized := sanitized - key;
  END LOOP;
  
  RETURN sanitized;
END;
$$;