-- Adicionar ON DELETE CASCADE nas foreign keys para permitir exclusão em cascata

-- 1. Recriar foreign key de profiles.agency_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_agency_id_fkey;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_agency_id_fkey 
  FOREIGN KEY (agency_id) 
  REFERENCES public.agencies(id) 
  ON DELETE CASCADE;

-- 2. Recriar foreign key de clients.agency_id
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_agency_id_fkey;
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_agency_id_fkey 
  FOREIGN KEY (agency_id) 
  REFERENCES public.agencies(id) 
  ON DELETE CASCADE;

-- 3. Recriar foreign key de contents.client_id
ALTER TABLE public.contents DROP CONSTRAINT IF EXISTS contents_client_id_fkey;
ALTER TABLE public.contents 
  ADD CONSTRAINT contents_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE CASCADE;

-- 4. Recriar foreign key de content_media.content_id
ALTER TABLE public.content_media DROP CONSTRAINT IF EXISTS content_media_content_id_fkey;
ALTER TABLE public.content_media 
  ADD CONSTRAINT content_media_content_id_fkey 
  FOREIGN KEY (content_id) 
  REFERENCES public.contents(id) 
  ON DELETE CASCADE;

-- 5. Recriar foreign key de content_texts.content_id
ALTER TABLE public.content_texts DROP CONSTRAINT IF EXISTS content_texts_content_id_fkey;
ALTER TABLE public.content_texts 
  ADD CONSTRAINT content_texts_content_id_fkey 
  FOREIGN KEY (content_id) 
  REFERENCES public.contents(id) 
  ON DELETE CASCADE;

-- 6. Recriar foreign key de comments.content_id
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_content_id_fkey;
ALTER TABLE public.comments 
  ADD CONSTRAINT comments_content_id_fkey 
  FOREIGN KEY (content_id) 
  REFERENCES public.contents(id) 
  ON DELETE CASCADE;

-- 7. Recriar foreign key de client_notes.client_id
ALTER TABLE public.client_notes DROP CONSTRAINT IF EXISTS client_notes_client_id_fkey;
ALTER TABLE public.client_notes 
  ADD CONSTRAINT client_notes_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE CASCADE;

-- 8. Criar função para deletar arquivos do storage quando deletar content_media
CREATE OR REPLACE FUNCTION delete_content_media_files()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletar arquivo src_url do storage
  IF OLD.src_url IS NOT NULL THEN
    PERFORM storage.delete(storage.foldername(OLD.src_url), storage.filename(OLD.src_url));
  END IF;
  
  -- Deletar arquivo thumb_url do storage se existir
  IF OLD.thumb_url IS NOT NULL THEN
    PERFORM storage.delete(storage.foldername(OLD.thumb_url), storage.filename(OLD.thumb_url));
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para deletar arquivos antes de deletar content_media
DROP TRIGGER IF EXISTS delete_content_media_files_trigger ON public.content_media;
CREATE TRIGGER delete_content_media_files_trigger
  BEFORE DELETE ON public.content_media
  FOR EACH ROW
  EXECUTE FUNCTION delete_content_media_files();