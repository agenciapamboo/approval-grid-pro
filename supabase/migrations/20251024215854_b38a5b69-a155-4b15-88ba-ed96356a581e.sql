-- Fix storage deletion helper to use correct argument types and robust path extraction
CREATE OR REPLACE FUNCTION public.delete_content_media_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  src_path text;
  thumb_path text;
BEGIN
  -- Delete src_url file from storage bucket if present
  IF OLD.src_url IS NOT NULL THEN
    src_path := split_part(OLD.src_url, '/content-media/', 2);
    IF src_path IS NOT NULL AND src_path <> '' THEN
      PERFORM storage.delete('content-media', src_path);
    END IF;
  END IF;

  -- Delete thumb_url file from storage bucket if present
  IF OLD.thumb_url IS NOT NULL THEN
    thumb_path := split_part(OLD.thumb_url, '/content-media/', 2);
    IF thumb_path IS NOT NULL AND thumb_path <> '' THEN
      PERFORM storage.delete('content-media', thumb_path);
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Ensure trigger exists (recreate safely)
DROP TRIGGER IF EXISTS trg_delete_content_media_files ON public.content_media;
CREATE TRIGGER trg_delete_content_media_files
BEFORE DELETE ON public.content_media
FOR EACH ROW
EXECUTE FUNCTION public.delete_content_media_files();