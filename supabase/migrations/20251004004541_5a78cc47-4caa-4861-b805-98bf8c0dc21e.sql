-- Corrigir função handle_new_user com search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'client_user'
  );
  RETURN NEW;
END;
$$;

-- Criar policies para content_texts que estava sem
ALTER TABLE public.content_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view content texts of accessible contents"
  ON public.content_texts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON (
      p.client_id = c.client_id 
      OR EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
      )
    )
    WHERE c.id = content_texts.content_id AND p.id = auth.uid()
  ));

CREATE POLICY "Users can insert content texts for accessible contents"
  ON public.content_texts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON (
      p.client_id = c.client_id 
      OR EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
      )
    )
    WHERE c.id = content_texts.content_id AND p.id = auth.uid()
  ));