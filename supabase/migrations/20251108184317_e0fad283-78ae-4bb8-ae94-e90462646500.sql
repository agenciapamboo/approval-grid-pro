-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'blocked_by_parent'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN blocked_by_parent BOOLEAN NOT NULL DEFAULT false;
        
        CREATE INDEX idx_profiles_blocked_by_parent ON public.profiles(blocked_by_parent);
        
        COMMENT ON COLUMN public.profiles.blocked_by_parent IS 
        'When true, user is blocked by parent (agency_admin) and cannot access the system';
    END IF;
END $$;