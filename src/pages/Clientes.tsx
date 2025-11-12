import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendPlatformNotificationDialog } from "@/components/admin/SendPlatformNotificationDialog";
import { ArrowLeft, Search, Users, DollarSign, TrendingUp, Send, Eye, Building2 } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  agency_id: string;
  agencies?: {
    name: string;
  };
}

const Clientes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, selectedPlan, clients]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        const enrichedProfile = { ...profileData, role: roleData || 'client_user' };
        setProfile(enrichedProfile);

        // Carregar clientes baseado no role
        if (roleData === 'super_admin') {
          await loadAllClients();
        } else if (roleData === 'agency_admin' && profileData.agency_id) {
          await loadAgencyClients(profileData.agency_id);
        }

        // Carregar notificações recentes
        await loadRecentNotifications();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*, agencies(name)")
      .order("name");
    
    if (data) setClients(data);
  };

  const loadAgencyClients = async (agencyId: string) => {
    const { data } = await supabase
      .from("clients")
      .select("*, agencies(name)")
      .eq("agency_id", agencyId)
      .order("name");
    
    if (data) setClients(data);
  };

  const loadRecentNotifications = async () => {
    const { data } = await supabase
      .from("platform_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (data) setRecentNotifications(data);
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedPlan !== "all") {
      // Filtrar por plano quando implementado
    }

    setFilteredClients(filtered);
  };

  const stats = {
    total: clients.length,
    expectedRevenue: clients.length * 150, // Exemplo
    avgTicket: clients.length > 0 ? Math.round((clients.length * 150) / clients.length) : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Clientes
              </h1>
              <p className="text-muted-foreground">
                Gerencie todos os clientes e envie notificações
              </p>
            </div>
            <Button onClick={() => setNotificationDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Notificação
            </Button>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Receita Esperada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.expectedRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.avgTicket)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
          <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={selectedPlan} onValueChange={setSelectedPlan}>
                  <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="creator">Creator</TabsTrigger>
                    <TabsTrigger value="eugencia">Eugência</TabsTrigger>
                    <TabsTrigger value="socialmidia">Social Mídia</TabsTrigger>
                    <TabsTrigger value="fullservice">Full Service</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Notificações Recentes */}
          {recentNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Notificações Recentes</CardTitle>
                <CardDescription>Últimas 5 notificações enviadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentNotifications.map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{notif.title}</p>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                      </div>
                      <Badge variant={notif.status === 'sent' ? 'default' : notif.status === 'pending' ? 'outline' : 'destructive'}>
                        {notif.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid de Clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card 
                key={client.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/clientes/${client.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="h-12 w-12 object-contain rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{client.slug}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.agencies && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Agência: {client.agencies.name}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/clientes/${client.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <SendPlatformNotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
      />

      <AppFooter />
    </div>
  );
};

export default Clientes;
