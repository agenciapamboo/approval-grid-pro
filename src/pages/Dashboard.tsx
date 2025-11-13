import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Users, Eye } from "lucide-react";
import { toast } from "sonner";

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
  const { role, loading: authLoading } = usePermissions();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (authLoading || !role) return;
    
    loadDashboardData();
  }, [user, role, authLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      
      setProfile(profileData);

      if (role === 'super_admin') {
        // RLS permite ver todas as agências
        const agenciesResponse = await supabase
          .from('agencies')
          .select('id, name, slug');
        
        const allAgencies = agenciesResponse.data || [];
        
        // Buscar clientes para cada agência
        const agenciesWithClients = await Promise.all(
          allAgencies.map(async (agency) => {
            const clientsResponse = await supabase
              .from('clients')
              .select('id, name, slug')
              .eq('agency_id', agency.id);
            
            return {
              ...agency,
              clients: clientsResponse.data || [],
            };
          })
        );
        
        setDashboardData({ agencies: agenciesWithClients });
      } else if (role === 'agency_admin' || role === 'team_member') {
        // RLS filtra por agency_id automaticamente
        const agencyResponse = await supabase
          .from('agencies')
          .select('id, name, slug')
          .single();
        
        if (agencyResponse.data) {
          const clientsResponse = await supabase
            .from('clients')
            .select('id, name, slug')
            .eq('agency_id', agencyResponse.data.id);
          
          setDashboardData({
            agency: {
              ...agencyResponse.data,
              clients: clientsResponse.data || [],
            },
          });
        }
      } else if (role === 'client_user') {
        // RLS filtra por client_id automaticamente
        const clientResponse = await supabase
          .from('clients')
          .select('id, name, slug, agency_id')
          .single();
        
        if (clientResponse.data) {
          const agencyResponse = await supabase
            .from('agencies')
            .select('id, name, slug')
            .eq('id', clientResponse.data.agency_id)
            .single();
          
          setDashboardData({
            client: {
              ...clientResponse.data,
              agencies: agencyResponse.data,
            },
          });
        }
      } else if (role === 'approver') {
        // Usar helper para evitar recursão de tipos
        const approverClients = await fetchApproverClients(user!.id);
        setDashboardData({ clients: approverClients });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader userName={profile?.name} userRole={role || undefined} onSignOut={() => navigate("/auth")} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {profile?.name}
            </p>
          </div>

          {/* Super Admin View */}
          {role === 'super_admin' && dashboardData?.agencies && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Agências ({dashboardData.agencies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dashboardData.agencies.map((agency: any) => (
                      <Card key={agency.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{agency.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {agency.clients?.length || 0} cliente(s)
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => navigate('/agencias')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Agency Admin / Team Member View */}
          {(role === 'agency_admin' || role === 'team_member') && dashboardData?.agency && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Clientes ({dashboardData.agency.clients?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(dashboardData.agency.clients || []).map((client: any) => (
                      <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Client User View */}
          {role === 'client_user' && dashboardData?.client && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seus Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Cliente:</strong> {dashboardData.client.name}</p>
                    <p><strong>Agência:</strong> {dashboardData.client.agencies?.name}</p>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    onClick={() => navigate('/content-grid')}
                  >
                    Ver Conteúdos
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Approver View */}
          {role === 'approver' && dashboardData?.clients && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Clientes para Aprovação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dashboardData.clients.map((client: any) => (
                      <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => navigate('/content-grid')}
                          >
                            Ver Conteúdos
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Dashboard;
