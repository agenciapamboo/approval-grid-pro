import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { CreateContentWrapper } from "@/components/content/CreateContentWrapper";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

interface Profile {
  id: string;
  name: string;
  role: string;
  agency_id?: string;
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
  channels?: string[];
}

export default function AgencyContentManager() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [contents, setContents] = useState<Content[]>([]);

  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  useEffect(() => {
    checkAuthAndLoadData();
  }, [clientId, monthParam, yearParam]);

  const checkAuthAndLoadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Carregar perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Verificar se é agency admin
      if (profileData.role !== 'agency_admin') {
        toast({
          title: "Acesso negado",
          description: "Esta página é apenas para administradores de agência",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setProfile(profileData);

      // Carregar cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .eq("agency_id", profileData.agency_id)
        .single();

      if (clientError || !clientData) {
        toast({
          title: "Cliente não encontrado",
          description: "Cliente não encontrado ou você não tem permissão",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setClient(clientData);

      // Carregar agência
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", profileData.agency_id)
        .single();

      if (agencyData) {
        setAgency(agencyData);
      }

      // Carregar conteúdos
      await loadContents(clientData.id);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
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

    // Filtrar por mês se especificado
    if (monthParam && yearParam) {
      const month = parseInt(monthParam);
      const year = parseInt(yearParam);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      query = query
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <span className="text-white text-sm font-medium">
            {client?.name || 'Cliente'} - Gerenciar Conteúdos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm hidden sm:block">{profile?.name}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut} 
            className="text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </AppHeader>

      <main className="container mx-auto px-4 py-8">
        {client && (
          <CreateContentWrapper 
            clientId={client.id}
            onContentCreated={() => loadContents(client.id)}
          />
        )}
        
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
                        isResponsible={true}
                        isAgencyView={true}
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
