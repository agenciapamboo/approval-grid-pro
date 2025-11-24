-- Phase 1: Fix client_ai_profiles table structure and permissions

-- 1. Drop incorrect constraint
ALTER TABLE public.client_ai_profiles 
DROP CONSTRAINT IF EXISTS client_ai_profiles_client_id_created_at_key;

-- 2. Add correct UNIQUE constraint on client_id only
ALTER TABLE public.client_ai_profiles 
ADD CONSTRAINT client_ai_profiles_client_id_key UNIQUE (client_id);

-- 3. Add missing columns
ALTER TABLE public.client_ai_profiles 
ADD COLUMN IF NOT EXISTS ai_generated_profile JSONB;

ALTER TABLE public.client_ai_profiles 
ADD COLUMN IF NOT EXISTS editorial_line TEXT;

-- 4. Create RLS policy for agency_admin to read ai_configurations
CREATE POLICY "agency_admin_read_ai_config" ON public.ai_configurations
  FOR SELECT 
  USING (has_role(auth.uid(), 'agency_admin'));