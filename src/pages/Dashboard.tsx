import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { useAgencyMetrics } from "@/hooks/useAgencyMetrics";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building2, Users, Loader2, FileText, Settings, Plus, FileImage, HardDrive, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import AccessGate from "@/components/auth/AccessGate";
import { SuperAdminStats } from "@/components/admin/SuperAdminStats";
import { NotificationSender } from "@/components/admin/NotificationSender";
import { ResourceUsagePanel } from "@/components/admin/ResourceUsagePanel";
import { AgencyStats } from "@/components/dashboard/AgencyStats";
import { AgencyMetricCard } from "@/components/admin/AgencyMetricCard";
import { ClientSelectorDialog } from "@/components/admin/ClientSelectorDialog";
import { PlanInfoCard } from "@/components/client/PlanInfoCard";
import { TeamMembersList } from "@/components/admin/TeamMembersList";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

/**
 * Dashboard - Página principal do painel
 * Exibe informações personalizadas baseadas no role do usuário
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, role, agency, client, loading: userDataLoading } = useUserData();
  const { metrics: agencyMetrics, loading: metricsLoading } = useAgencyMetrics(profile?.agency_id || null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);

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
          .select('id, status, created_at, published_at, is_content_plan, date')
          .eq('client_id', profile.client_id);
        
        // Buscar dados completos do cliente e agência
        const { data: fullClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', profile.client_id)
          .single();
        
        const { data: fullAgency } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', fullClient?.agency_id)
          .maybeSingle();
        
        const now = new Date();
        
        // Calcular stats com lógica atualizada
        const stats = {
          // Pendentes: rascunhos + em revisão
          pending: contents?.filter(c => 
            c.status === 'draft' || c.status === 'in_review'
          ).length || 0,
          
          // Produzindo: planos de conteúdo + ajustes solicitados
          producing: contents?.filter(c => 
            c.is_content_plan === true || c.status === 'changes_requested'
          ).length || 0,
          
          // Agendados: aprovados que não chegaram na data de publicação
          scheduled: contents?.filter(c => 
            c.status === 'approved' && 
            (!c.published_at && (!c.date || new Date(c.date) > now))
          ).length || 0,
          
          // Publicados: aprovados e agendados que chegaram na data programada
          published: contents?.filter(c => 
            c.status === 'approved' && (c.published_at || (c.date && new Date(c.date) <= now))
          ).length || 0,
        };
        
        // Calcular criativos do mês
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        
        const creativesThisMonth = contents?.filter(
          c => new Date(c.created_at) >= startOfMonth
        ).length || 0;
        
        // Criativos enviados para aprovação no mês (in_review ou aprovados que foram criados este mês)
        const createdForApproval = contents?.filter(
          c => new Date(c.created_at) >= startOfMonth && 
               (c.status === 'in_review' || c.status === 'approved' || c.status === 'changes_requested')
        ).length || 0;
        
        const monthlyLimit = fullClient?.monthly_creatives || 0;
        const percentage = monthlyLimit > 0 
          ? (creativesThisMonth / monthlyLimit) * 100 
          : 0;
        
        // Buscar histórico de meses anteriores baseado no plano da agência
        let monthlyHistory = [];
        if (fullAgency?.plan) {
          const { data: planEntitlements } = await supabase
            .from('plan_entitlements')
            .select('history_days')
            .eq('plan', fullAgency.plan)
            .maybeSingle();
          
          if (planEntitlements && planEntitlements.history_days > 0) {
            const monthsToShow = Math.floor(planEntitlements.history_days / 30);
            
            for (let i = 1; i <= Math.min(monthsToShow, 12); i++) {
              const monthStart = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
              const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 0, 23, 59, 59);
              
              const monthContents = contents?.filter(
                c => {
                  const createdDate = new Date(c.created_at);
                  return createdDate >= monthStart && createdDate <= monthEnd &&
                         (c.status === 'in_review' || c.status === 'approved' || c.status === 'changes_requested');
                }
              ).length || 0;
              
              monthlyHistory.push({
                month: format(monthStart, "MMMM/yyyy", { locale: ptBR }),
                count: monthContents
              });
            }
          }
        }
        
        setDashboardData({
          client: {
            ...client,
            agency: fullAgency || agency
          },
          stats,
          monthlyCreatives: {
            used: creativesThisMonth,
            limit: monthlyLimit,
            percentage,
            created: createdForApproval,
            history: monthlyHistory
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

        {(role === 'agency_admin' || role === 'team_member') && profile?.agency_id && (
          <div className="space-y-6">
            {/* BLOCO 01: Botão Cadastrar Novo Cliente */}
            <div className="flex justify-end">
              <Button onClick={() => navigate('/clientes/novo')}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Novo Cliente
              </Button>
            </div>

            {/* BLOCO 02: Cards de Métricas - 1 coluna mobile, 2 desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LINHA 1: Criativos do Mês + Armazenamento (2 colunas) */}
            <div className="grid grid-cols-2 gap-4">
              <AgencyMetricCard
                title="Criativos do Mês"
                icon={FileImage}
                value={agencyMetrics.creativesThisMonth.used}
                limit={agencyMetrics.creativesThisMonth.limit}
                percentage={agencyMetrics.creativesThisMonth.percentage}
                metric="usage"
                onClick={() => setClientSelectorOpen(true)}
              />
              
              <AgencyMetricCard
                title="Armazenamento"
                icon={HardDrive}
                value={agencyMetrics.creativesStorage.used}
                limit={agencyMetrics.creativesStorage.limit}
                percentage={agencyMetrics.creativesStorage.percentage}
                metric="usage"
              />
            </div>

            {/* LINHA 2: Aprovados + Ajustes + Reprovados (3 colunas) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AgencyMetricCard
                title="Criativos Aprovados"
                icon={CheckCircle}
                value={agencyMetrics.approvalRate.approved}
                limit={agencyMetrics.approvalRate.total}
                percentage={agencyMetrics.approvalRate.percentage}
                metric="approval"
              />
              
              <AgencyMetricCard
                title="Solicitações de Ajuste"
                icon={RefreshCw}
                value={agencyMetrics.reworkRate.adjustments}
                limit={agencyMetrics.reworkRate.total}
                percentage={agencyMetrics.reworkRate.percentage}
                metric="rework"
              />
              
              <AgencyMetricCard
                title="Criativos Reprovados"
                icon={XCircle}
                value={agencyMetrics.rejectionRate.rejected}
                limit={agencyMetrics.rejectionRate.total}
                percentage={agencyMetrics.rejectionRate.percentage}
                metric="rejection"
              />
            </div>
            </div>

            {/* NOVO: Lista de Membros da Equipe */}
            {profile?.agency_id && (
              <TeamMembersList agencyId={profile.agency_id} />
            )}

            {/* BLOCO 03: Lista de Clientes com botão de acesso */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes ({dashboardData?.agency?.clients?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.agency?.clients && dashboardData.agency.clients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.agency.clients.map((client: any) => (
                      <Card
                        key={client.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/cliente/${client.id}`)}
                      >
                        <CardHeader>
                          <CardTitle className="text-base">{client.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" size="sm" className="w-full">
                            Acessar Cliente
                          </Button>
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

            {/* BLOCO 04: Envio de Notificações */}
            <NotificationSender />

            {/* Diálogo de seleção de cliente */}
            <ClientSelectorDialog 
              open={clientSelectorOpen}
              onOpenChange={setClientSelectorOpen}
            />
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
                      {dashboardData.client.agency && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {dashboardData.client.agency.name}
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

            {/* Informações do Plano */}
            {dashboardData.client && <PlanInfoCard clientId={dashboardData.client.id} />}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card Pendentes */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?filter=pending')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dashboardData.stats?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rascunhos e em revisão
                  </p>
                </CardContent>
              </Card>

              {/* Card Produzindo */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?filter=producing')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Produzindo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dashboardData.stats?.producing || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Planos e ajustes solicitados
                  </p>
                </CardContent>
              </Card>

              {/* Card Agendados */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?filter=scheduled')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Agendados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{dashboardData.stats?.scheduled || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aprovados aguardando data
                  </p>
                </CardContent>
              </Card>

              {/* Card Publicados */}
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => navigate('/conteudo?filter=published')}
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
