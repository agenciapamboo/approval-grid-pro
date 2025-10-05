-- Add channels column to contents table
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS channels text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.contents.channels IS 'Array of social media channels: Facebook, Instagram, LinkedIn, TikTok, YouTube';