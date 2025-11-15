import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Loader2, FileText, Settings } from "lucide-react";
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
        
        setDashboardData({
          client: {
            ...client,
            agency: agency
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
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

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
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {dashboardData.client.name}</p>
                  <p><strong>Agência:</strong> {dashboardData.client.agency?.name || 'Não informada'}</p>
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
