-- Remove o check constraint obsoleto que só permite 'agency' e 'creator'
-- O sistema agora usa a tabela user_roles para gerenciar roles (team_member, agency_admin, etc)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- account_type agora é apenas um campo legado para compatibilidade
-- As permissões reais vêm da tabela user_roles