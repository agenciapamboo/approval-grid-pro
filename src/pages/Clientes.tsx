import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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

  const [monthlyStats, setMonthlyStats] = useState({
    totalUsed: 0,
    totalLimit: 0,
    percentage: 0,
    archivedCount: 0,
    activeCreatives: 0,
  });

  useEffect(() => {
    if (clients.length > 0) {
      loadMonthlyStats();
    }
  }, [clients]);

  const loadMonthlyStats = async () => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const clientIds = clients.map(c => c.id);

    // Buscar limite total de criativos
    const { data: clientsData } = await supabase
      .from('clients')
      .select('monthly_creatives')
      .in('id', clientIds);

    const totalLimit = (clientsData || []).reduce((sum, c) => sum + (c.monthly_creatives || 0), 0);

    // Contar posts criados no mês
    const { count: totalUsed } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .gte('created_at', startOfMonth.toISOString());

    // Contar criativos arquivados
    const { count: archivedCount } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .eq('status', 'archived');

    // Contar criativos ativos
    const { count: activeCreatives } = await supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .neq('status', 'archived');

    const percentage = totalLimit > 0 ? (totalUsed || 0) / totalLimit * 100 : 0;

    setMonthlyStats({
      totalUsed: totalUsed || 0,
      totalLimit,
      percentage,
      archivedCount: archivedCount || 0,
      activeCreatives: activeCreatives || 0,
    });
  };

  const stats = {
    total: clients.length,
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <CardTitle className="text-sm font-medium">Publicações do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{monthlyStats.totalUsed}</p>
                    <span className="text-muted-foreground text-sm">/ {monthlyStats.totalLimit}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(monthlyStats.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {monthlyStats.percentage.toFixed(1)}% da cota mensal utilizada
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Criativos Arquivados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{monthlyStats.archivedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Conteúdos arquivados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Criativos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{monthlyStats.activeCreatives}</p>
                {monthlyStats.activeCreatives > monthlyStats.totalLimit && (
                  <Badge variant="destructive" className="mt-2">Excedendo limite</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
          <CardContent>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
