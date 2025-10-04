-- Add plan and renewal date fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN plan text DEFAULT 'free',
ADD COLUMN plan_renewal_date timestamp with time zone;

-- Create an index for better performance
CREATE INDEX idx_profiles_plan ON public.profiles(plan);