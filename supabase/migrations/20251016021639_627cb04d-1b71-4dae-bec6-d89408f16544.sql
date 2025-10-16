-- Add client-level notification preferences
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notify_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_webhook boolean DEFAULT true;
