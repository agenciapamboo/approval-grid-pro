import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContentCard } from "@/components/content/ContentCard";
import { CreateContentCard } from "@/components/content/CreateContentCard";
import { ContentCategorySelector } from "@/components/content/ContentCategorySelector";
import { ContentFilters } from "@/components/content/ContentFilters";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { triggerWebhook } from "@/lib/webhooks";
import { createNotification } from "@/lib/notifications";
import { format } from "date-fns";

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
  category?: string;
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
  const [filteredContents, setFilteredContents] = useState<Content[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<'social' | 'avulso'>('social');
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const categoryParam = searchParams.get("category") as 'social' | 'avulso' | null;

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
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const startStr = format(startDate, "yyyy-MM-dd HH:mm:ss");
      const endStr = format(endDate, "yyyy-MM-dd HH:mm:ss");
      
      query = query
        .gte("date", startStr)
        .lte("date", endStr);

    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar conteúdos:", error);
      return;
    }

    setContents(data || []);
    setFilteredContents(data || []);
  };

  useEffect(() => {
    applyFilters();
  }, [contents, searchTerm, statusFilter, dateFilter]);

  const applyFilters = () => {
    let filtered = [...contents];

    if (searchTerm) {
      filtered = filtered.filter(content => 
        content.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(content => content.status === statusFilter);
    }

    if (dateFilter) {
      const filterDate = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter(content => (content.date || "").slice(0, 10) === filterDate);
    }

    setFilteredContents(filtered);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSendAllForReview = async () => {
    if (!client) return;

    try {
      // Buscar todos os conteúdos em rascunho
      const { data: draftContents, error: fetchError } = await supabase
        .from("contents")
        .select("*")
        .eq("client_id", client.id)
        .eq("status", "draft");

      if (fetchError) throw fetchError;

      if (!draftContents || draftContents.length === 0) {
        toast({
          title: "Nenhum conteúdo em rascunho",
          description: "Não há conteúdos em rascunho para enviar",
          variant: "destructive",
        });
        return;
      }

      // Disparar notificação para cada conteúdo (sem alterar status)
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const content of draftContents) {
        const resBulk = await createNotification('content.ready_for_approval', content.id, {
          title: content.title,
          date: content.date,
          actor: {
            name: user?.user_metadata?.name || user?.email || 'Agência',
            email: user?.email,
            phone: (user?.user_metadata as any)?.phone || undefined,
          },
          channels: content.channels || [],
        });
        console.log('Disparo de notificação (bulk):', { event: 'content.ready_for_approval', content_id: content.id, ok: resBulk.success });
      }

      toast({
        title: "Conteúdos enviados para aprovação",
        description: `${draftContents.length} conteúdo(s) enviado(s) para aprovação do cliente`,
      });

      // Recarregar conteúdos
      await loadContents(client.id);
    } catch (error) {
      console.error("Erro ao enviar conteúdos para revisão:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar conteúdos para revisão",
        variant: "destructive",
      });
    }
  };

  // Agrupar conteúdos por mês e categoria
  const groupedContents = filteredContents.reduce((groups, content) => {
    const date = new Date(content.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const category = content.category || 'social';
    const key = `${monthKey}-${category}`;
    
    if (!groups[key]) {
      groups[key] = {
        month: monthKey,
        category,
        contents: []
      };
    }
    groups[key].contents.push(content);
    return groups;
  }, {} as Record<string, { month: string; category: string; contents: Content[] }>);

  const sortedGroupKeys = Object.keys(groupedContents).sort((a, b) => {
    const [monthA] = a.split('-');
    const [monthB] = b.split('-');
    return monthB.localeCompare(monthA);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        userName={profile?.name}
        userRole="Administrador da Agência"
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8">
        {client && (
          <div className="space-y-4 mb-6">
            {/* Seletor de Categoria */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={selectedCategory === 'social' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('social')}
              >
                Redes Sociais
              </Button>
              <Button
                variant={selectedCategory === 'avulso' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('avulso')}
              >
                Avulso
              </Button>
            </div>

            {/* Bloco de Cadastro de Conteúdo - Sempre Visível */}
            <CreateContentCard 
              clientId={client.id}
              onContentCreated={() => {
                loadContents(client.id);
              }}
              category={selectedCategory}
            />
            
            <div className="flex justify-end">
              <Button
                onClick={handleSendAllForReview}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Todos para Aprovação
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <ContentFilters 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateChange={setDateFilter}
          />
        </div>
        
        {sortedGroupKeys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum conteúdo encontrado
          </div>
        ) : (
          <div className="space-y-12 mt-6">
            {sortedGroupKeys.map((groupKey) => {
              const group = groupedContents[groupKey];
              const [year, month] = group.month.split('-');
              const monthDate = new Date(parseInt(year), parseInt(month) - 1);
              const monthName = monthDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              });
              const categoryLabel = group.category === 'avulso' ? 'Avulso' : 'Redes Sociais';

              return (
                <div key={groupKey}>
                  <h2 className="text-2xl font-semibold capitalize mb-4">
                    {monthName} - {categoryLabel}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.contents.map((content) => (
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
