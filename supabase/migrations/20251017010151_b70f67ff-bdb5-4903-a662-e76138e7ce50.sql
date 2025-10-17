-- Tabela para armazenar credenciais de redes sociais dos clientes
CREATE TABLE public.client_social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  page_id TEXT,
  instagram_business_account_id TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform, account_id)
);

-- Enable RLS
ALTER TABLE public.client_social_accounts ENABLE ROW LEVEL SECURITY;

-- Agency admins podem gerenciar contas sociais dos seus clientes
CREATE POLICY "Agency admins can manage their clients social accounts"
ON public.client_social_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = client_social_accounts.client_id
    AND p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.agency_id = c.agency_id
    WHERE c.id = client_social_accounts.client_id
    AND p.id = auth.uid()
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);

-- Clientes podem ver suas próprias contas
CREATE POLICY "Clients can view their social accounts"
ON public.client_social_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.client_id = client_social_accounts.client_id
    AND p.id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_client_social_accounts_updated_at
BEFORE UPDATE ON public.client_social_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campo auto_publish no contents
ALTER TABLE public.contents
ADD COLUMN auto_publish BOOLEAN DEFAULT false,
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN publish_error TEXT;