-- Fase 4: Refatorar RLS Policies - Remover acesso público e criar policies seguras

-- ============================================
-- REMOVER POLICIES PÚBLICAS PERIGOSAS
-- ============================================

DROP POLICY IF EXISTS "Public can view contents for 2FA approval flow" ON contents;
DROP POLICY IF EXISTS "Public can view content media for 2FA approval flow" ON content_media;
DROP POLICY IF EXISTS "Public can view content texts for 2FA approval flow" ON content_texts;
DROP POLICY IF EXISTS "Public can view comments for 2FA approval flow" ON comments;

-- ============================================
-- CRIAR POLICIES SEGURAS PARA APROVADORES
-- ============================================

-- Aprovadores podem ver conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can view client contents"
ON contents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_approvers ca
    WHERE ca.user_id = auth.uid()
      AND ca.client_id = contents.client_id
      AND ca.is_active = true
  )
);

-- Aprovadores podem ver mídias dos conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can view client content media"
ON content_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contents c
    INNER JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_media.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

-- Aprovadores podem ver textos dos conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can view client content texts"
ON content_texts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contents c
    INNER JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_texts.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

-- Aprovadores podem ver comentários dos conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can view client comments"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contents c
    INNER JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = comments.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

-- Aprovadores podem inserir comentários nos conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can insert comments"
ON comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contents c
    INNER JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = comments.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

-- Aprovadores podem atualizar status dos conteúdos dos clientes que aprovam
CREATE POLICY "Approvers can update client contents"
ON contents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM client_approvers ca
    WHERE ca.user_id = auth.uid()
      AND ca.client_id = contents.client_id
      AND ca.is_active = true
  )
);

-- Aprovadores podem inserir novas versões de textos
CREATE POLICY "Approvers can insert content texts"
ON content_texts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contents c
    INNER JOIN client_approvers ca ON ca.client_id = c.client_id
    WHERE c.id = content_texts.content_id
      AND ca.user_id = auth.uid()
      AND ca.is_active = true
  )
);

-- ============================================
-- POLICIES PARA VISUALIZAÇÃO DE APROVADORES
-- ============================================

-- Aprovadores podem ver dados do cliente que aprovam
CREATE POLICY "Approvers can view their clients"
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_approvers ca
    WHERE ca.user_id = auth.uid()
      AND ca.client_id = clients.id
      AND ca.is_active = true
  )
);

-- Aprovadores podem ver dados da agência
CREATE POLICY "Approvers can view their agencies"
ON agencies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_approvers ca
    WHERE ca.user_id = auth.uid()
      AND ca.agency_id = agencies.id
      AND ca.is_active = true
  )
);

-- Comentários para documentação
COMMENT ON POLICY "Approvers can view client contents" ON contents IS 'Aprovadores autenticados via 2FA podem visualizar conteúdos apenas dos clientes atribuídos a eles';
COMMENT ON POLICY "Approvers can update client contents" ON contents IS 'Aprovadores podem alterar status (aprovar, rejeitar, solicitar ajustes) dos conteúdos dos clientes que aprovam';