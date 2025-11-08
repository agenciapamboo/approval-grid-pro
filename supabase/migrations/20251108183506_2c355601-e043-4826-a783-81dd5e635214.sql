-- Add skip_subscription_check column to profiles
ALTER TABLE public.profiles 
ADD COLUMN skip_subscription_check BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX idx_profiles_skip_subscription_check ON public.profiles(skip_subscription_check);

-- Set skip_subscription_check = true for unlimited plan users
UPDATE public.profiles 
SET skip_subscription_check = true 
WHERE plan = 'unlimited';

-- Add comment
COMMENT ON COLUMN public.profiles.skip_subscription_check IS 
'When true, user bypasses all subscription checks (for internal/unlimited users)';