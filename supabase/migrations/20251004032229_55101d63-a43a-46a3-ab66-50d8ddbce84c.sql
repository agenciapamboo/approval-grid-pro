-- Criar tabela de observações de clientes
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Agency admins can view notes of their clients
CREATE POLICY "Agency admins can view their client notes"
ON public.client_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = client_notes.client_id
    AND p.id = auth.uid()
  )
);

-- Agency admins can insert notes for their clients
CREATE POLICY "Agency admins can insert client notes"
ON public.client_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = client_notes.client_id
    AND p.id = auth.uid()
    AND p.role = 'agency_admin'
  )
);

-- Create index for better performance
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at DESC);