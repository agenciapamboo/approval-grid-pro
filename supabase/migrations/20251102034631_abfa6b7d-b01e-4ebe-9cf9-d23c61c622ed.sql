-- Add Stripe subscription columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS billing_cycle text CHECK (billing_cycle IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid')),
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS delinquent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS grace_period_end timestamp with time zone;

-- Update existing plan column to use new values if needed
-- The plan column already exists, so we just need to ensure it can hold the new values

-- Create entitlements table to store plan limits and features
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL UNIQUE CHECK (plan IN ('creator', 'eugencia', 'socialmidia', 'fullservice')),
  posts_limit integer,
  creatives_limit integer,
  history_days integer NOT NULL,
  team_members_limit integer,
  whatsapp_support boolean DEFAULT false,
  graphics_approval boolean DEFAULT false,
  supplier_link boolean DEFAULT false,
  global_agenda boolean DEFAULT false,
  team_kanban boolean DEFAULT false,
  team_notifications boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on plan_entitlements
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read entitlements
CREATE POLICY "Anyone can read plan entitlements"
ON public.plan_entitlements
FOR SELECT
TO authenticated
USING (true);

-- Insert default entitlements for each plan
INSERT INTO public.plan_entitlements (plan, posts_limit, creatives_limit, history_days, team_members_limit, whatsapp_support, graphics_approval, supplier_link, global_agenda, team_kanban, team_notifications)
VALUES 
  ('creator', 80, 80, 30, 1, false, false, false, false, false, false),
  ('eugencia', 100, 200, 60, 1, false, false, false, false, false, false),
  ('socialmidia', 120, 300, 90, 3, true, false, false, false, false, false),
  ('fullservice', NULL, 500, 90, NULL, true, true, true, true, true, true)
ON CONFLICT (plan) DO NOTHING;

-- Create function to get entitlements for a user's plan
CREATE OR REPLACE FUNCTION public.get_user_entitlements(user_id uuid)
RETURNS TABLE (
  plan text,
  posts_limit integer,
  creatives_limit integer,
  history_days integer,
  team_members_limit integer,
  whatsapp_support boolean,
  graphics_approval boolean,
  supplier_link boolean,
  global_agenda boolean,
  team_kanban boolean,
  team_notifications boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pe.plan,
    pe.posts_limit,
    pe.creatives_limit,
    pe.history_days,
    pe.team_members_limit,
    pe.whatsapp_support,
    pe.graphics_approval,
    pe.supplier_link,
    pe.global_agenda,
    pe.team_kanban,
    pe.team_notifications
  FROM profiles p
  JOIN plan_entitlements pe ON pe.plan = p.plan
  WHERE p.id = user_id;
$$;

-- Create function to check if user subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN p.subscription_status IN ('active', 'trialing') THEN true
      WHEN p.subscription_status = 'past_due' AND p.grace_period_end > now() THEN true
      ELSE false
    END
  FROM profiles p
  WHERE p.id = user_id;
$$;

-- Create trigger function to update is_pro based on subscription status
CREATE OR REPLACE FUNCTION public.update_is_pro_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set is_pro to true if subscription is active or in grace period
  IF NEW.subscription_status IN ('active', 'trialing') THEN
    NEW.is_pro := true;
  ELSIF NEW.subscription_status = 'past_due' AND NEW.grace_period_end > now() THEN
    NEW.is_pro := true;
  ELSE
    NEW.is_pro := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update is_pro
DROP TRIGGER IF EXISTS trigger_update_is_pro ON public.profiles;
CREATE TRIGGER trigger_update_is_pro
  BEFORE INSERT OR UPDATE OF subscription_status, grace_period_end
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_is_pro_status();

-- Create trigger to update updated_at on plan_entitlements
DROP TRIGGER IF EXISTS trigger_update_plan_entitlements_updated_at ON public.plan_entitlements;
CREATE TRIGGER trigger_update_plan_entitlements_updated_at
  BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();