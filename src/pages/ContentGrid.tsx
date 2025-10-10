import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentFilters } from "@/components/content/ContentFilters";
import { LGPDConsent } from "@/components/lgpd/LGPDConsent";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  // Agrupar conteúdos por mês
  const groupedContents = contents.reduce((groups, content) => {
    const date = new Date(content.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(content);
    return groups;
  }, {} as Record<string, Content[]>);

  const sortedMonthKeys = Object.keys(groupedContents).sort((a, b) => b.localeCompare(a));

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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader>
        <span className="text-white text-sm">{client?.name || 'Cliente'}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut} 
          className="text-white hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </AppHeader>

      <main className="container mx-auto px-4 py-8">
        <ContentFilters />
        
        {sortedMonthKeys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum conteúdo encontrado
          </div>
        ) : (
          <div className="space-y-12 mt-6">
            {sortedMonthKeys.map((monthKey) => {
              const [year, month] = monthKey.split('-');
              const monthDate = new Date(parseInt(year), parseInt(month) - 1);
              const monthName = monthDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              });

              return (
                <div key={monthKey}>
                  <h2 className="text-2xl font-semibold capitalize mb-4">
                    {monthName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedContents[monthKey].map((content) => (
                      <ContentCard 
                        key={content.id} 
                        content={content}
                        isResponsible={false}
                        isAgencyView={false}
                        onUpdate={() => loadContents(client!.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
