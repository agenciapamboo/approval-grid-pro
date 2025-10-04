-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE public.user_role AS ENUM ('super_admin', 'agency_admin', 'client_user');
CREATE TYPE public.content_type AS ENUM ('image', 'carousel', 'reels');
CREATE TYPE public.content_status AS ENUM ('draft', 'in_review', 'changes_requested', 'approved');
CREATE TYPE public.media_kind AS ENUM ('image', 'video');
CREATE TYPE public.legal_basis AS ENUM ('contract', 'legitimate_interest');
CREATE TYPE public.webhook_status AS ENUM ('queued', 'sent', 'error');

-- Agencies table
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  brand_primary TEXT DEFAULT '#2563eb',
  brand_secondary TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  webhook_url TEXT,
  responsible_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, slug)
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'client_user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  accepted_terms_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for responsible_user_id after profiles table is created
ALTER TABLE public.clients
ADD CONSTRAINT fk_responsible_user
FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Contents table
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  deadline DATE,
  type public.content_type NOT NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content media table
CREATE TABLE public.content_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  kind public.media_kind NOT NULL,
  src_url TEXT NOT NULL,
  thumb_url TEXT,
  converted BOOLEAN NOT NULL DEFAULT false,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content texts table (for caption versioning)
CREATE TABLE public.content_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(content_id, version)
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  delivered_at TIMESTAMPTZ,
  status public.webhook_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consents table (LGPD)
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  legal_basis public.legal_basis NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_clients_agency ON public.clients(agency_id);
CREATE INDEX idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX idx_profiles_client ON public.profiles(client_id);
CREATE INDEX idx_contents_client ON public.contents(client_id);
CREATE INDEX idx_contents_date ON public.contents(date);
CREATE INDEX idx_content_media_content ON public.content_media(content_id);
CREATE INDEX idx_comments_content ON public.comments(content_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity, entity_id);

-- Enable RLS on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (users can see their own profile)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- RLS Policies for agencies (super_admin can see all, agency_admin can see their own)
CREATE POLICY "Super admins can view all agencies"
ON public.agencies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Agency admins can view their agency"
ON public.agencies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND agency_id = agencies.id
  )
);

-- RLS Policies for clients
CREATE POLICY "Super admins can view all clients"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Agency admins can view their clients"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND agency_id = clients.agency_id
  )
);

CREATE POLICY "Client users can view their client"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND client_id = clients.id
  )
);

-- RLS Policies for contents
CREATE POLICY "Users can view contents of their client"
ON public.contents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can insert contents for their client"
ON public.contents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
);

CREATE POLICY "Users can update contents of their client"
ON public.contents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.clients c ON c.agency_id = p.agency_id
    WHERE p.id = auth.uid() AND c.id = contents.client_id
  )
);

-- Similar policies for content_media, content_texts, comments
CREATE POLICY "Users can view media of accessible contents"
ON public.content_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON p.client_id = c.client_id OR EXISTS (
      SELECT 1 FROM public.clients cl WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
    )
    WHERE c.id = content_media.content_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert media for accessible contents"
ON public.content_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON p.client_id = c.client_id OR EXISTS (
      SELECT 1 FROM public.clients cl WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
    )
    WHERE c.id = content_media.content_id AND p.id = auth.uid()
  )
);

-- Comments policies
CREATE POLICY "Users can view comments on accessible contents"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON p.client_id = c.client_id OR EXISTS (
      SELECT 1 FROM public.clients cl WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
    )
    WHERE c.id = comments.content_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert comments on accessible contents"
ON public.comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.profiles p ON p.client_id = c.client_id OR EXISTS (
      SELECT 1 FROM public.clients cl WHERE cl.id = c.client_id AND cl.agency_id = p.agency_id
    )
    WHERE c.id = comments.content_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (auth.uid() = author_user_id);

CREATE POLICY "Agency admins can delete comments on their clients' contents"
ON public.comments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.contents c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.profiles p ON p.agency_id = cl.agency_id
    WHERE c.id = comments.content_id AND p.id = auth.uid() AND p.role = 'agency_admin'
  )
);

-- Activity log policies (read-only for most users)
CREATE POLICY "Users can view activity log for their context"
ON public.activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert activity log"
ON public.activity_log FOR INSERT
WITH CHECK (true);

-- Webhook events (only for system and agency admins)
CREATE POLICY "Agency admins can view their webhook events"
ON public.webhook_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.profiles p ON p.agency_id = c.agency_id
    WHERE c.id = webhook_events.client_id AND p.id = auth.uid() AND p.role = 'agency_admin'
  )
);

-- Consents policies
CREATE POLICY "Users can view their own consents"
ON public.consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents"
ON public.consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation (creates profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'client_user'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();