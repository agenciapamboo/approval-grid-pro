-- Adicionar coluna agency_id em client_approvers
ALTER TABLE client_approvers 
ADD COLUMN agency_id uuid REFERENCES agencies(id);

-- Preencher agency_id baseado em clients.agency_id
UPDATE client_approvers ca
SET agency_id = c.agency_id
FROM clients c
WHERE ca.client_id = c.id;

-- Tornar NOT NULL após preencher
ALTER TABLE client_approvers 
ALTER COLUMN agency_id SET NOT NULL;

-- Adicionar índice para performance
CREATE INDEX idx_client_approvers_agency_id ON client_approvers(agency_id);

-- Criar função de validação
CREATE OR REPLACE FUNCTION validate_approver_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_agency_id uuid;
BEGIN
  -- Buscar agency_id do cliente
  SELECT agency_id INTO v_client_agency_id
  FROM clients
  WHERE id = NEW.client_id;

  -- Validar que agency_id do approver bate com agency_id do cliente
  IF NEW.agency_id != v_client_agency_id THEN
    RAISE EXCEPTION 'agency_id do aprovador deve ser igual ao agency_id do cliente';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para validação
CREATE TRIGGER ensure_approver_agency_matches_client
BEFORE INSERT OR UPDATE ON client_approvers
FOR EACH ROW
EXECUTE FUNCTION validate_approver_agency();