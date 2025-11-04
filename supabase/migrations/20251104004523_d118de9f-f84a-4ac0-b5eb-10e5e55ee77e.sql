-- Add instagram_handle field to profiles table
ALTER TABLE public.profiles
ADD COLUMN instagram_handle text,
ADD COLUMN instagram_verified boolean DEFAULT false;