import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentFilters } from "@/components/content/ContentFilters";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentCard } from "@/components/content/CreateContentCard";

interface Profile {
  id: string;
  name: string;
  role: string;
  client_id?: string;
  agency_id?: string;
  accepted_terms_at?: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  agency_id: string;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
}

interface Content {
  id: string;
  title: string;
  date: string;
  deadline?: string;
  type: string;
  status: string;
  client_id: string;
  owner_user_id: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export default function ContentGrid() {
  const { agencySlug, clientSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [agencySlug, clientSlug]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Carregar perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Verificar consentimento LGPD
      if (!profileData.accepted_terms_at) {
        setShowConsent(true);
        return;
      }

      // Carregar agência
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("slug", agencySlug)
        .single();

      if (agencyError) throw agencyError;
      setAgency(agencyData);

      // Carregar cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("slug", clientSlug)
        .eq("agency_id", agencyData.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Verificar permissões
      if (profileData.role === 'client_user' && profileData.client_id !== clientData.id) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar este cliente",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      if (profileData.role === 'agency_admin' && profileData.agency_id !== agencyData.id) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta agência",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Carregar conteúdos
      await loadContents(clientData.id);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContents = async (clientId: string) => {
    const { data, error } = await supabase
      .from("contents")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar conteúdos:", error);
      return;
    }

    setContents(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleConsentAccepted = () => {
    setShowConsent(false);
    checkAuthAndLoadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (showConsent) {
    return <LGPDConsent onAccept={handleConsentAccepted} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header com marca branca */}
      <header 
        className="border-b"
        style={{
          background: agency?.brand_primary 
            ? `linear-gradient(to right, ${agency.brand_primary}, ${agency.brand_secondary || agency.brand_primary})`
            : undefined
        }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {agency?.logo_url && (
              <img src={agency.logo_url} alt={agency.name} className="h-10" />
            )}
            <div className="text-white">
              <h1 className="text-xl font-bold">{client?.name}</h1>
              <p className="text-sm opacity-90">{agency?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">{profile?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ContentFilters />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {profile?.role === 'agency_admin' && (
            <CreateContentCard 
              clientId={client!.id}
              onContentCreated={() => loadContents(client!.id)}
            />
          )}
          
          {contents.map((content) => (
            <ContentCard 
              key={content.id} 
              content={content}
              isResponsible={false}
              onUpdate={() => loadContents(client!.id)}
            />
          ))}
        </div>

        {contents.length === 0 && profile?.role !== 'agency_admin' && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum conteúdo encontrado
          </div>
        )}
      </main>
    </div>
  );
}
