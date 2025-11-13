-- ============================================
-- FASE 1: Habilitar permissões para agency_admin
-- ============================================

-- Garantir que manage_clients está habilitado para agency_admin
INSERT INTO role_permissions (role, permission_key, enabled)
VALUES ('agency_admin', 'manage_clients', true)
ON CONFLICT (role, permission_key) 
DO UPDATE SET enabled = true, updated_at = now();

-- ============================================
-- FASE 2: RLS Policies para clients e agencies
-- ============================================

-- Policy para client_user acessar seu próprio cliente
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Users can view their own client'
  ) THEN
    CREATE POLICY "Users can view their own client"
      ON clients FOR SELECT
      USING (
        id IN (
          SELECT client_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy para client_user acessar agência do seu cliente
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agencies' 
    AND policyname = 'Users can view their client agency'
  ) THEN
    CREATE POLICY "Users can view their client agency"
      ON agencies FOR SELECT
      USING (
        id IN (
          SELECT agency_id FROM clients 
          WHERE id IN (
            SELECT client_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;