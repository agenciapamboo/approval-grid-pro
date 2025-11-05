-- Tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas super admins podem ver e editar configurações
CREATE POLICY "Super admins can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir webhook interno padrão
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'internal_webhook_url',
  'https://webhook.pamboocriativos.com.br/webhook/d9e34937-f301-emailsinternos',
  'URL do webhook N8N para notificações internas do sistema'
) ON CONFLICT (key) DO NOTHING;