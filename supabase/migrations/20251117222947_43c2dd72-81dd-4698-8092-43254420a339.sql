-- Add is_primary_thumbnail column to content_media table
ALTER TABLE content_media 
ADD COLUMN is_primary_thumbnail BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_content_media_primary_thumbnail 
ON content_media(content_id, is_primary_thumbnail) 
WHERE is_primary_thumbnail = true;

-- Add comment explaining the column
COMMENT ON COLUMN content_media.is_primary_thumbnail IS 'Marca o thumbnail principal para carrosséis (primeiro slide) e outros conteúdos com múltiplas mídias';