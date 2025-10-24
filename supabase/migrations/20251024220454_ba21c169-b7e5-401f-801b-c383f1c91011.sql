-- Drop failing storage deletion trigger/function cleanly
DROP TRIGGER IF EXISTS delete_content_media_files_trigger ON public.content_media;
DROP TRIGGER IF EXISTS trg_delete_content_media_files ON public.content_media;
DROP FUNCTION IF EXISTS public.delete_content_media_files() CASCADE;