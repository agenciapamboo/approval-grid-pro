-- Create RPC function to get accurate monthly content count for a client
CREATE OR REPLACE FUNCTION get_client_monthly_content_count(
  p_client_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_client_id UUID;
  v_user_agency_id UUID;
  v_client_agency_id UUID;
BEGIN
  -- Get user's client_id and agency_id
  SELECT client_id, agency_id INTO v_user_client_id, v_user_agency_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get client's agency_id
  SELECT agency_id INTO v_client_agency_id
  FROM clients
  WHERE id = p_client_id;

  -- Allow if: same client OR same agency OR super_admin
  IF (v_user_client_id = p_client_id) 
    OR (v_user_agency_id = v_client_agency_id)
    OR (has_role(auth.uid(), 'super_admin')) THEN
    
    RETURN (
      SELECT COUNT(*)::INTEGER
      FROM contents
      WHERE client_id = p_client_id
        AND EXTRACT(YEAR FROM created_at) = p_year
        AND EXTRACT(MONTH FROM created_at) = p_month
    );
  ELSE
    RAISE EXCEPTION 'Acesso negado ao cliente %', p_client_id;
  END IF;
END;
$$;

-- Create RPC function to get monthly history (last 6 months excluding current)
CREATE OR REPLACE FUNCTION get_client_monthly_history(
  p_client_id UUID,
  p_months_back INTEGER DEFAULT 6
)
RETURNS TABLE(month TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_client_id UUID;
  v_user_agency_id UUID;
  v_client_agency_id UUID;
BEGIN
  -- Get user's client_id and agency_id
  SELECT client_id, agency_id INTO v_user_client_id, v_user_agency_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get client's agency_id
  SELECT agency_id INTO v_client_agency_id
  FROM clients
  WHERE id = p_client_id;

  -- Allow if: same client OR same agency OR super_admin
  IF (v_user_client_id = p_client_id) 
    OR (v_user_agency_id = v_client_agency_id)
    OR (has_role(auth.uid(), 'super_admin')) THEN
    
    RETURN QUERY
    SELECT 
      TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM') as month,
      COUNT(*)::BIGINT as count
    FROM contents c
    WHERE c.client_id = p_client_id
      AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE) - (p_months_back || ' months')::INTERVAL
      AND c.created_at < DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY DATE_TRUNC('month', c.created_at)
    HAVING COUNT(*) > 0
    ORDER BY month DESC;
  ELSE
    RAISE EXCEPTION 'Acesso negado ao cliente %', p_client_id;
  END IF;
END;
$$;