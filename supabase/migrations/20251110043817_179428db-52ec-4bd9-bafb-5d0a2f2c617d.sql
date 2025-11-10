-- Create table for content suggestions feedback (machine learning)
CREATE TABLE IF NOT EXISTS public.content_suggestions_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suggestions_client ON public.content_suggestions_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_date ON public.content_suggestions_feedback(used_at);

-- Enable RLS
ALTER TABLE public.content_suggestions_feedback ENABLE ROW LEVEL SECURITY;

-- Agency admins can view feedback for their clients
CREATE POLICY "Agency admins can view their clients feedback"
ON public.content_suggestions_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.profiles p ON p.agency_id = c.agency_id
    WHERE c.id = content_suggestions_feedback.client_id
    AND p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);

-- System can insert feedback
CREATE POLICY "System can insert feedback"
ON public.content_suggestions_feedback
FOR INSERT
WITH CHECK (true);