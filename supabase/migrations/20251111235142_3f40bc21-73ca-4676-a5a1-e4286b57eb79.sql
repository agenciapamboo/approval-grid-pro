-- Inserir permissões para excluir solicitações criativas
INSERT INTO role_permissions (role, permission_key, enabled) 
VALUES ('client_user', 'delete_creative_request', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO role_permissions (role, permission_key, enabled) 
VALUES ('agency_admin', 'delete_creative_request', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Permissão para agency_admin converter solicitação em conteúdo
INSERT INTO role_permissions (role, permission_key, enabled) 
VALUES ('agency_admin', 'convert_request_to_content', true)
ON CONFLICT (role, permission_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Permitir que client_user exclua suas próprias solicitações criativas
CREATE POLICY "client_users_can_delete_own_requests"
ON notifications
FOR DELETE
USING (
  event = 'novojob' 
  AND user_id = auth.uid()
);

-- Permitir que agency_admin exclua solicitações de sua agência
CREATE POLICY "agency_admins_can_delete_requests"
ON notifications
FOR DELETE
USING (
  event = 'novojob'
  AND agency_id IN (
    SELECT agency_id FROM profiles WHERE id = auth.uid()
  )
  AND has_role(auth.uid(), 'agency_admin')
);