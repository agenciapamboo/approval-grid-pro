-- Add agency_id column to contents table for simplified RLS
ALTER TABLE contents ADD COLUMN IF NOT EXISTS agency_id uuid;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contents_agency_id ON contents(agency_id);

-- Populate agency_id from clients table
UPDATE contents
SET agency_id = clients.agency_id
FROM clients
WHERE contents.client_id = clients.id
AND contents.agency_id IS NULL;

-- Create trigger to maintain agency_id
CREATE OR REPLACE FUNCTION trg_contents_set_agency()
RETURNS TRIGGER AS $$
BEGIN
  -- When client_id changes, update agency_id
  IF NEW.client_id IS NOT NULL THEN
    SELECT agency_id INTO NEW.agency_id
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_contents_set_agency_trigger ON contents;
CREATE TRIGGER trg_contents_set_agency_trigger
  BEFORE INSERT OR UPDATE OF client_id ON contents
  FOR EACH ROW
  EXECUTE FUNCTION trg_contents_set_agency();