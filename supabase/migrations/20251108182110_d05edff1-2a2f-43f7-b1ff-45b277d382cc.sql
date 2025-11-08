-- Etapa 1A: Adicionar role team_member ao enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'team_member';