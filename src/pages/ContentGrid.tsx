import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  
  // Obter mês e ano dos parâmetros da URL (null se não especificado)
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const currentMonth = monthParam ? parseInt(monthParam) : null;
  const currentYear = yearParam ? parseInt(yearParam) : null;

  useEffect(() => {
    checkAuthAndLoadData();
  }, [agencySlug, clientSlug, currentMonth, currentYear]);

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

      // Carregar dados de agência/cliente com RLS em mente
      if (profileData.role === 'client_user') {
        // client_user não possui permissão de SELECT direto em agencies.
        // Buscar apenas o cliente pelo slug e seguir sem carregar a agência.
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("slug", clientSlug)
          .maybeSingle();

        if (clientError || !clientData) {
          toast({
            title: "Cliente não encontrado",
            description: "Não foi possível carregar o cliente.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setClient(clientData);
        await loadContents(clientData.id);
      } else {
        // Para admins, podemos carregar agência e validar pertencimento
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("slug", agencySlug)
          .maybeSingle();

        if (agencyError || !agencyData) {
          throw agencyError || new Error("Agência não encontrada");
        }
        setAgency(agencyData);

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("slug", clientSlug)
          .eq("agency_id", agencyData.id)
          .maybeSingle();

        if (clientError || !clientData) {
          throw clientError || new Error("Cliente não encontrado");
        }
        setClient(clientData);

        if (profileData.role === 'agency_admin' && profileData.agency_id !== agencyData.id) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta agência",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        await loadContents(clientData.id);
      }
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
    let query = supabase
      .from("contents")
      .select("*")
      .eq("client_id", clientId);

    // Aplicar filtro de mês apenas se mês/ano estiverem especificados
    if (currentMonth && currentYear) {
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      query = query
        .gte("date", firstDay.toISOString().split('T')[0])
        .lte("date", lastDay.toISOString().split('T')[0]);
    }

    const { data, error } = await query.order("date", { ascending: false });

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

  const navigateToMonth = (monthDelta: number) => {
    if (!currentMonth || !currentYear) return;
    
    const newDate = new Date(currentYear, currentMonth - 1 + monthDelta, 1);
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    navigate(`/a/${agencySlug}/c/${clientSlug}?month=${newMonth}&year=${newYear}`);
  };

  const monthName = currentMonth && currentYear 
    ? new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : "Todos os conteúdos";

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
            {profile?.role === 'agency_admin' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
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
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-white/20">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Navegação de Mês - apenas se tiver mês selecionado */}
        {currentMonth && currentYear && (
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Mês Anterior
            </Button>
            
            <h2 className="text-xl font-semibold capitalize">{monthName}</h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToMonth(1)}
            >
              Próximo Mês
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {!currentMonth && !currentYear && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{monthName}</h2>
          </div>
        )}

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
              isAgencyView={profile?.role === 'agency_admin'}
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
