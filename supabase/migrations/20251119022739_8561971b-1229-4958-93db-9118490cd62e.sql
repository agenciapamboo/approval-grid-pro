-- Criar ENUM para funções de membros da equipe
CREATE TYPE public.team_member_function AS ENUM (
  'atendimento',
  'planejamento',
  'redacao',
  'design',
  'audiovisual',
  'revisao',
  'publicacao',
  'trafego'
);

-- Criar tabela de relacionamento N:N entre membros e funções
CREATE TABLE public.team_member_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function team_member_function NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, function)
);

-- Índices para performance
CREATE INDEX idx_team_member_functions_user_id ON public.team_member_functions(user_id);
CREATE INDEX idx_team_member_functions_function ON public.team_member_functions(function);

-- Enable RLS
ALTER TABLE public.team_member_functions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Agency admins podem visualizar funções de membros da sua agência
CREATE POLICY "Agency admins can view their team member functions"
ON public.team_member_functions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = team_member_functions.user_id
    AND p.agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);

-- Agency admins podem inserir funções para membros da sua agência
CREATE POLICY "Agency admins can insert team member functions"
ON public.team_member_functions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = team_member_functions.user_id
    AND p.agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);

-- Agency admins podem deletar funções de membros da sua agência
CREATE POLICY "Agency admins can delete team member functions"
ON public.team_member_functions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = team_member_functions.user_id
    AND p.agency_id = get_user_agency_id(auth.uid())
    AND has_role(auth.uid(), 'agency_admin'::app_role)
  )
);

-- Team members podem visualizar suas próprias funções
CREATE POLICY "Team members can view their own functions"
ON public.team_member_functions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());