
-- Fix the remaining Security Definer View issue
-- In PostgreSQL 15+, views run with the owner's permissions by default (like SECURITY DEFINER)
-- We need to set security_invoker = true to make them run with the querying user's permissions

-- Drop and recreate the view with security_invoker option
DROP VIEW IF EXISTS public.current_subscription_distribution;

CREATE VIEW public.current_subscription_distribution
WITH (security_invoker = true)
AS
SELECT 
  plan,
  subscription_status,
  count(*) AS total,
  sum(
    CASE
      WHEN subscription_status = ANY (ARRAY['active'::text, 'trialing'::text]) THEN 1
      ELSE 0
    END
  ) AS active_count
FROM profiles p
WHERE account_type = ANY (ARRAY['creator'::text, 'agency'::text])
GROUP BY plan, subscription_status;

-- Grant access to authenticated users
GRANT SELECT ON public.current_subscription_distribution TO authenticated;

-- Add comment explaining the security_invoker option
COMMENT ON VIEW public.current_subscription_distribution IS 'Aggregates subscription distribution data. Uses security_invoker=true to run with querying user permissions, respecting RLS policies on underlying tables.';
