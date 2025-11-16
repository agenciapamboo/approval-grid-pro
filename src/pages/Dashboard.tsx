import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, Users, Loader2, FileText, Settings, Plus } from "lucide-react";
import { toast } from "sonner";
import AccessGate from "@/components/auth/AccessGate";
import { SuperAdminStats } from "@/components/admin/SuperAdminStats";
import { NotificationSender } from "@/components/admin/NotificationSender";
import { ResourceUsagePanel } from "@/components/admin/ResourceUsagePanel";
import { AgencyStats } from "@/components/dashboard/AgencyStats";

// Helper para evitar inferência de tipos recursiva do Supabase
async function fetchApproverClients(userId: string) {
  // @ts-ignore - Supabase types recursion issue
  const linksResponse = await supabase
    .from('client_approvers')
    .select('client_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!linksResponse.data || linksResponse.data.length === 0) {
    return [];
  }
  
  const clientIds = linksResponse.data.map((link: any) => link.client_id);
  // @ts-ignore - Supabase types recursion issue
  const clientsResponse = await supabase
    .from('clients')
    .select('id, name, slug')
    .in('id', clientIds);
  
  return clientsResponse.data || [];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, role, agency, client, loading: userDataLoading } = useUserData();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (userDataLoading || !role || !profile) return;
    
    loadDashboardData();
  }, [user, role, profile, userDataLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      console.log('[Dashboard] Loading data for role:', role, 'profile:', profile);

      // LÓGICA POR ROLE - Filtrar NO CÓDIGO usando profile.agency_id e client_id
      if (role === 'super_admin') {
        // Super admin vê tudo
        const { data: agencies } = await supabase
          .from('agencies')
          .select('id, name, slug');
        
        // Buscar clientes para cada agência
        const agenciesWithClients = await Promise.all(
          (agencies || []).map(async (agency) => {
            const { data: clients } = await supabase
              .from('clients')
              .select('id, name, slug')
              .eq('agency_id', agency.id);
            
            return { ...agency, clients: clients || [] };
          })
        );
        
        setDashboardData({ agencies: agenciesWithClients });
        
      } else if (role === 'agency_admin' || role === 'team_member') {
        // Filtrar POR agency_id do profile
        if (!profile?.agency_id) {
          toast.error('Você não está vinculado a nenhuma agência');
          setLoading(false);
          return;
        }
        
        console.log('[Dashboard] Fetching clients for agency_id:', profile.agency_id);
        
        // Buscar clientes desta agência DIRETAMENTE
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, slug')
          .eq('agency_id', profile.agency_id)
          .order('name');
        
        if (clientsError) {
          console.error('[Dashboard] Error fetching clients:', clientsError);
          toast.error('Erro ao carregar clientes');
          setLoading(false);
          return;
        }
        
        console.log('[Dashboard] Clients loaded:', clients?.length || 0);
        
        setDashboardData({
          agency: {
            ...agency,
            clients: clients || []
          }
        });
        
      } else if (role === 'client_user') {
        // Filtrar POR client_id do profile
        if (!profile?.client_id) {
          toast.error('Você não está vinculado a nenhum cliente');
          setLoading(false);
          return;
        }
        
        // Buscar estatísticas de conteúdo
        const { data: contents } = await supabase
          .from('contents')
          .select('status, created_at, published_at')
          .eq('client_id', profile.client_id);
        
        // Buscar dados completos do cliente
        const { data: fullClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', profile.client_id)
          .single();
        
        // Calcular stats
        const stats = {
          draft: contents?.filter(c => c.status === 'draft').length || 0,
          in_review: contents?.filter(c => c.status === 'in_review').length || 0,
          approved: contents?.filter(c => c.status === 'approved').length || 0,
          published: contents?.filter(c => c.status === 'approved' && c.published_at).length || 0,
        };
        
        // Calcular criativos do mês
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const creativesThisMonth = contents?.filter(
          c => new Date(c.created_at) >= startOfMonth
        ).length || 0;
        
        const monthlyLimit = fullClient?.monthly_creatives || 0;
        const percentage = monthlyLimit > 0 
          ? (creativesThisMonth / monthlyLimit) * 100 
          : 0;
        
        setDashboardData({
          client: {
            ...client,
            agency: agency
          },
          stats,
          monthlyCreatives: {
            used: creativesThisMonth,
            limit: monthlyLimit,
            percentage
          }
        });
        
      } else if (role === 'approver') {
        // Buscar clientes que este aprovador pode aprovar
        const approverClients = await fetchApproverClients(user!.id);
        setDashboardData({ clients: approverClients });
      }
      
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (userDataLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super Admin View
  if (role === 'super_admin') {
    return (
      <AccessGate allow={['super_admin']}>
        <AppLayout>
          <div className="container mx-auto px-6 py-8 space-y-6">
            <SuperAdminStats />
            <NotificationSender />
            <ResourceUsagePanel />
          </div>
        </AppLayout>
      </AccessGate>
    );
  }

  // Other Roles View
  return (
    <AppLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Dashboard</h1>

        {(role === 'agency_admin' || role === 'team_member') && dashboardData?.agency && (
          <div className="grid gap-6">
            {/* Agency Statistics */}
            {profile?.agency_id && <AgencyStats agencyId={profile.agency_id} />}
            
            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" 
                onClick={() => navigate('/clientes')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gerenciar Clientes
                  </CardTitle>
                  <CardDescription>Ver e editar clientes da agência</CardDescription>
                </CardHeader>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" 
                onClick={() => navigate('/creative-requests')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Solicitações de Criativos
                  </CardTitle>
                  <CardDescription>Ver solicitações pendentes</CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" 
                onClick={() => navigate('/configuracoes')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurações
                  </CardTitle>
                  <CardDescription>Ajustar preferências do sistema</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Clients List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clientes ({dashboardData.agency.clients?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.agency.clients && dashboardData.agency.clients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardData.agency.clients.map((client: any) => (
                      <Card
                        key={client.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/cliente/${client.id}`)}
                      >
                        <CardHeader>
                          <CardTitle>{client.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Clique para ver o conteúdo
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum cliente cadastrado ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {role === 'client_user' && dashboardData?.client && (
          <div className="space-y-6">
            {/* Header do Cliente */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {dashboardData.client.logo_url ? (
                      <img 
                        src={dashboardData.client.logo_url} 
                        alt={dashboardData.client.name} 
                        className="h-16 w-16 object-contain rounded" 
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-2xl">{dashboardData.client.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {dashboardData.client.slug}
                      </p>
                      {dashboardData.client.agency && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Agência: {dashboardData.client.agency.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="gap-2 hidden md:flex">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/conteudo')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Conteúdos
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => navigate('/solicitar-criativo')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Solicitar Criativos
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card Pendentes (Rascunhos + Em Revisão) */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?status=pendentes')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {(dashboardData.stats?.draft || 0) + (dashboardData.stats?.in_review || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rascunhos e em revisão
                  </p>
                </CardContent>
              </Card>

              {/* Card Aprovados */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?status=approved')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dashboardData.stats?.approved || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prontos para publicar
                  </p>
                </CardContent>
              </Card>

              {/* Card Publicados */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?status=published')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Publicados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dashboardData.stats?.published || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conteúdos ao vivo
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Informações do Plano */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Criativos do Mês</span>
                    <span className="text-sm font-medium">
                      {dashboardData.monthlyCreatives?.used || 0} / {dashboardData.monthlyCreatives?.limit || 0}
                    </span>
                  </div>
                  <Progress value={dashboardData.monthlyCreatives?.percentage || 0} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(dashboardData.monthlyCreatives?.percentage || 0).toFixed(1)}% da cota utilizada
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {role === 'approver' && dashboardData?.clients && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Meus Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.clients.map((client: any) => (
                    <Card
                      key={client.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/cliente/${client.id}/conteudo`)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {client.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Clique para revisar conteúdo
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
