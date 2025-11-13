import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Users, Building2, FileImage, ArrowRight, MessageSquare, Eye, Pencil, Plus, AlertCircle, CheckCircle, Trash2, Sparkles, Clock, XCircle, Shield, Calendar as CalendarIcon, UserPlus, History as HistoryIcon, TrendingUp, DollarSign, Server, Bell, Loader2, BarChart3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AddAgencyDialog } from "@/components/admin/AddAgencyDialog";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { ViewAgencyDialog } from "@/components/admin/ViewAgencyDialog";
import { EditAgencyDialog } from "@/components/admin/EditAgencyDialog";
import { ViewClientDialog } from "@/components/admin/ViewClientDialog";
import { EditClientDialog } from "@/components/admin/EditClientDialog";
import { MonthSelectorDialog } from "@/components/admin/MonthSelectorDialog";
import { ContentCategorySelector } from "@/components/content/ContentCategorySelector";
import { AddClientDialog } from "@/components/admin/AddClientDialog";
import { RequestCreativeDialog } from "@/components/admin/RequestCreativeDialog";
import { CreativeRequestDialog } from "@/components/admin/CreativeRequestDialog";
import { EditCreativeRequestDialog } from "@/components/admin/EditCreativeRequestDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { NotificationSender } from "@/components/admin/NotificationSender";
import { TestNotificationButton } from "@/components/admin/TestNotificationButton";
import { ProfilesManager } from "@/components/admin/ProfilesManager";
import { AgencyCalendar } from "@/components/calendar/AgencyCalendar";
import { TeamMembersManager } from "@/components/admin/TeamMembersManager";
import { ContentKanban } from "@/components/content/ContentKanban";
import { ClientLimitsMetrics } from "@/components/admin/ClientLimitsMetrics";
import { AgencyLimitsOverview } from "@/components/admin/AgencyLimitsOverview";
import { ResourceUsagePanel } from "@/components/admin/ResourceUsagePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NewClientsAlert } from "@/components/admin/NewClientsAlert";
import { KanbanColumnManager } from "@/components/admin/KanbanColumnManager";



interface Profile {
  id: string;
  name: string;
  role: string;
  agency_id: string | null;
  client_id: string | null;
  account_type?: string | null;
  plan?: string | null;
  agency_name?: string | null;
  responsible_name?: string | null;
  created_at?: string;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  logo_url?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  plan?: string | null;
  plan_renewal_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  agency_id: string;
  cnpj?: string | null;
  plan_renewal_date?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  monthly_creatives?: number | null;
  agencies?: Agency | null;
}

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  channels?: string[];
  category?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientDataLoaded, setClientDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewClientOpen, setViewClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
  const [contents, setContents] = useState<Content[]>([]);
  const [contentsByMonth, setContentsByMonth] = useState<Record<string, Content[]>>({});
  const [clientNotifications, setClientNotifications] = useState<Record<string, { adjustments: number; approved: number; rejected: number; creatives: number; new: number }>>({});
  const [openViewAgencyId, setOpenViewAgencyId] = useState<string | null>(null);
  const [openEditAgencyId, setOpenEditAgencyId] = useState<string | null>(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [requestCreativeOpen, setRequestCreativeOpen] = useState(false);
  const [selectedCreativeRequest, setSelectedCreativeRequest] = useState<any>(null);
  const [showCreativeRequestDialog, setShowCreativeRequestDialog] = useState(false);
  const [creativeRequests, setCreativeRequests] = useState<any[]>([]);
  const [editCreativeOpen, setEditCreativeOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Fetch profile e role
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar o perfil.",
        });
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.error("Profile not found");
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Perfil não encontrado.",
        });
        setLoading(false);
        return;
      }

      // Buscar role do usuário (com precedência correta via função do backend)
      const { data: userRoleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (roleError) {
        console.error("Erro ao obter role do usuário:", roleError);
      }

      const userRole = (userRoleData as string) || 'client_user';
      const enrichedProfile = { ...profileData, role: userRole };
      setProfile(enrichedProfile as any);

      // Carregar dados baseado no role
      // NOTE: These client-side role checks are for UX only (showing/hiding UI elements).
      // All actual authorization is enforced server-side via RLS policies.
      if (userRole === 'super_admin') {
        // Super admin vê todas agências
        const { data: agenciesData } = await supabase
          .from("agencies")
          .select("*")
          .order("name");
        
        if (agenciesData) {
          // Buscar email do admin para cada agência que não tem email
          const enrichedAgencies = await Promise.all(
            agenciesData.map(async (agency) => {
              const agencyData = agency as Agency;
              if (!agencyData.email) {
                const { data: adminEmail } = await supabase
                  .rpc('get_agency_admin_email', { agency_id_param: agencyData.id });
                return { ...agencyData, email: adminEmail || null } as Agency;
              }
              return agencyData;
            })
          );
          setAgencies(enrichedAgencies);
        }

        // Buscar todos os profiles e montar roles/agência via consultas separadas para evitar RLS/nested issues
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (profilesData && profilesData.length > 0) {
          const userIds = profilesData.map((p: any) => p.id);

          // Buscar roles de todos os usuários
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);

          const rolesMap: Record<string, string[]> = {};
          (rolesData || []).forEach((r: any) => {
            if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
            rolesMap[r.user_id].push(r.role);
          });

          // Buscar nomes das agências e contar clientes
          const { data: agenciesLookup } = await supabase
            .from("agencies")
            .select("id, name");
          const agencyNameMap = new Map((agenciesLookup || []).map((a: any) => [a.id, a.name]));

          // Contar clientes por agência
          const { data: clientCounts } = await supabase
            .from("clients")
            .select("agency_id");
          
          const clientCountMap = new Map<string, number>();
          (clientCounts || []).forEach((c: any) => {
            const count = clientCountMap.get(c.agency_id) || 0;
            clientCountMap.set(c.agency_id, count + 1);
          });

          // Buscar emails via edge function
          const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds }
          });

          const emailMap = emailData?.emailMap || {};

          const enrichedProfiles = profilesData.map((p: any) => {
            const roles = rolesMap[p.id] || [];
            const resolvedRole = roles.includes('super_admin')
              ? 'super_admin'
              : roles.includes('agency_admin')
                ? 'agency_admin'
                : (roles[0] || 'client_user');
            return {
              ...p,
              role: resolvedRole,
              agency_name: p.agency_id ? (agencyNameMap.get(p.agency_id) || null) : null,
              client_count: p.agency_id ? (clientCountMap.get(p.agency_id) || 0) : 0,
              email: emailMap[p.id] || null,
            };
          });

          setAllProfiles(enrichedProfiles as any);
        } else {
          setAllProfiles([]);
        }
      } else if (userRole === 'agency_admin' && enrichedProfile.agency_id) {
        console.log('🔷 Agency Admin detected - Loading data', {
          userId: user.id,
          agencyId: enrichedProfile.agency_id,
          role: userRole
        });
        
        // Agency admin vê sua agência e clientes
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("id", enrichedProfile.agency_id)
          .maybeSingle();
        
        if (agencyError) {
          console.error("Error fetching agency:", agencyError);
        }
        if (agencyData) setAgencies([agencyData]);

        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .eq("agency_id", enrichedProfile.agency_id)
          .order("name");
        
        if (clientsError) {
          console.error("Error fetching clients:", clientsError);
        }
        
        if (clientsData) {
          console.log('✅ Clients loaded for agency_admin:', {
            count: clientsData.length,
            clients: clientsData.map(c => ({ id: c.id, name: c.name }))
          });
          setClients(clientsData);
          
          // Buscar notificações de conteúdo e criativos para cada cliente
          const notifications: Record<string, { adjustments: number; approved: number; rejected: number; creatives: number; new: number }> = {};
          const now = new Date();
          
          for (const client of clientsData) {
            const { data: contentsData } = await supabase
              .from("contents")
              .select("status, date")
              .eq("client_id", client.id);
            
            const { data: creativesData } = await supabase
              .from("notifications")
              .select("id")
              .eq("client_id", client.id)
              .eq("event", "novojob")
              .eq("status", "pending");
            
            if (contentsData) {
              notifications[client.id] = {
                new: creativesData?.length || 0,
                adjustments: contentsData.filter(c => c.status === 'in_review').length,
                approved: contentsData.filter(c => c.status === 'approved' && new Date(c.date) > now).length,
                rejected: contentsData.filter(c => c.status === 'changes_requested' && new Date(c.date) > now).length,
                creatives: 0,
              };
            }
          }
          
          setClientNotifications(notifications);
        }
      } else if (userRole === 'agency_admin' && !enrichedProfile.agency_id) {
        console.error('❌ Agency Admin sem agency_id:', enrichedProfile.id);
        toast({
          variant: "destructive",
          title: "Configuração incompleta",
          description: "Seu perfil está incompleto. Entre em contato com o suporte para completar seu cadastro.",
        });
        setLoading(false);
        return;
      } else if (userRole === 'client_user') {
        if (!enrichedProfile.client_id) {
          console.error('❌ Client user sem client_id associado:', enrichedProfile.id);
          toast({
            variant: "destructive",
            title: "Configuração incompleta",
            description: "Seu perfil está incompleto. Entre em contato com o suporte para completar seu cadastro.",
          });
          setClientDataLoaded(false);
          return;
        }

      console.log('🔄 Loading client data for client_id:', enrichedProfile.client_id);
      
      try {
        // PASSO 1: Buscar apenas o cliente
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", enrichedProfile.client_id)
          .maybeSingle();
        
        if (clientError) {
          console.error("❌ Error fetching client:", clientError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar seus dados. Por favor, recarregue a página.",
          });
          setClientDataLoaded(false);
          return;
        }
        
        if (!clientData) {
          console.warn('⚠️ Cliente não encontrado para client_id:', enrichedProfile.client_id);
          toast({
            variant: "destructive",
            title: "Cliente não encontrado",
            description: "Seu cadastro não foi encontrado. Entre em contato com o suporte.",
          });
          setClientDataLoaded(false);
          return;
        }
        
        console.log('✅ Client data loaded:', {
          clientId: clientData.id,
          clientSlug: clientData.slug,
          agencyId: clientData.agency_id,
        });
        
        // PASSO 2: Buscar a agência usando o agency_id do cliente
        if (!clientData.agency_id) {
          console.warn('⚠️ Cliente sem agência associada:', clientData.id);
          toast({
            variant: "destructive",
            title: "Agência não encontrada",
            description: "Seu cliente não está associado a uma agência. Entre em contato com o suporte.",
          });
          setClientDataLoaded(false);
          return;
        }
        
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("id, name, slug, brand_primary, brand_secondary, logo_url, email, whatsapp")
          .eq("id", clientData.agency_id)
          .maybeSingle();
        
        if (agencyError) {
          console.error("❌ Error fetching agency:", agencyError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar agência",
            description: "Não foi possível carregar dados da agência. Por favor, recarregue a página.",
          });
          setClientDataLoaded(false);
          return;
        }
        
        if (!agencyData) {
          console.warn('⚠️ Agência não encontrada:', clientData.agency_id);
          toast({
            variant: "destructive",
            title: "Agência não encontrada",
            description: "A agência associada ao seu cadastro não foi encontrada. Entre em contato com o suporte.",
          });
          setClientDataLoaded(false);
          return;
        }
        
        console.log('✅ Agency data loaded:', {
          agencyId: agencyData.id,
          agencySlug: agencyData.slug,
        });
        
        setClients([clientData]);
        setAgencies([agencyData]);
        setClientDataLoaded(true);
        
      } catch (error) {
        console.error('❌ Unexpected error loading client data:', error);
        toast({
          variant: "destructive",
          title: "Erro inesperado",
          description: "Ocorreu um erro ao carregar seus dados. Por favor, recarregue a página.",
        });
        setClientDataLoaded(false);
      }

        // Buscar conteúdos do cliente
        const { data: contentsData, error: contentsError } = await supabase
          .from("contents")
          .select("*")
          .eq("client_id", enrichedProfile.client_id)
          .order("date", { ascending: false });
        
        if (contentsError) {
          console.error("Error fetching contents:", contentsError);
        }
        
        if (contentsData) {
          setContents(contentsData);
          
          // Organizar por mês
          const grouped = contentsData.reduce((acc, content) => {
            const date = new Date(content.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(content);
            return acc;
          }, {} as Record<string, Content[]>);
          
          setContentsByMonth(grouped);
        }

        // Buscar solicitações criativas do cliente
        const { data: requestsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("client_id", profileData.client_id)
          .eq("event", "novojob")
          .order("created_at", { ascending: false });
        
        if (requestsData) {
          setCreativeRequests(requestsData);
        }
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do dashboard.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getClientAgency = (clientAgencyId: string) => {
    return agencies.find(a => a.id === clientAgencyId);
  };

  const fetchClients = async () => {
    if (profile?.agency_id) {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", profile.agency_id)
        .order("name");
      
      if (clientsData) setClients(clientsData);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Cliente removido",
        description: `O cliente ${client.name} foi removido com sucesso.`,
      });

      setClients((prev) => prev.filter((c) => c.id !== client.id));
      await fetchClients();
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o cliente.",
      });
    }
  };

  const handleDeleteAgency = async (agency: Agency) => {
    if (!window.confirm(`⚠️ ATENÇÃO: Deseja excluir a agência "${agency.name}"?\n\nEsta ação irá remover:\n- A agência\n- Todos os usuários da agência\n- Todos os clientes\n- Todos os conteúdos e arquivos\n\nEsta ação NÃO pode ser desfeita!`)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("agencies")
        .delete()
        .eq("id", agency.id)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nenhuma linha deletada. Verifique permissões RLS.");
      }

      toast({
        title: "Agência removida",
        description: `A agência ${agency.name} e todos os seus dados foram removidos com sucesso.`,
      });

      setAgencies((prev) => prev.filter((a) => a.id !== agency.id));
    } catch (error) {
      console.error("Erro ao remover agência:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a agência.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: "Super Administrador",
      agency_admin: "Administrador da Agência",
      client_user: "Usuário do Cliente",
    };
    return roles[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex flex-col">
      <AppHeader 
        userName={profile?.name}
        userRole={getRoleLabel(profile?.role || "")}
        onProfileClick={() => setOpenProfileDialog(true)}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Olá, {profile?.name} 👋
            </h2>
            <p className="text-muted-foreground">
              {/* Client-side role check for UX only - actual authorization via server-side RLS */}
              {profile?.role === 'super_admin' && 'Gerencie toda a plataforma'}
              {profile?.role === 'agency_admin' && 'Gerencie os clientes da sua agência'}
              {profile?.role === 'client_user' && 'Revise e aprove seus conteúdos'}
            </p>
          </div>
          <div className="flex gap-3">
            {profile?.role === 'client_user' && clients[0] && agencies[0] && (
              <Button 
                variant="success" 
                onClick={() => setRequestCreativeOpen(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Solicitar Criativo
              </Button>
            )}
            {/* Client-side role check for UX only - server validates actual permissions */}
            {profile?.role === 'super_admin' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/blocked-ips')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  IPs Bloqueados
                </Button>
                <AddAgencyDialog onAgencyAdded={checkAuth} />
                <TestNotificationButton />
              </>
            )}
          </div>
        </div>

            {/* Avisos de Novos Clientes - apenas para super_admin */}
            {profile?.role === 'super_admin' && (
              <NewClientsAlert />
            )}

            {/* SUPER ADMIN - Dashboard Simplificado */}
            {profile?.role === 'super_admin' && (
              <div className="space-y-6">

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/clientes")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Total de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{clients.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receitas/mês
              </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clients.length * 150)}
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/agencias")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Agências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{agencies.length}</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate("/admin/usuarios")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{allProfiles.length}</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-2 p-0 h-auto text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/admin/auditoria-usuarios");
                    }}
                  >
                    Ver auditoria →
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Cards de Navegação Rápida */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/agencias")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Agências
                  </CardTitle>
                  <CardDescription>
                    Gerencie agências, planos e dados de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/configuracoes")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Configurações
                  </CardTitle>
                  <CardDescription>
                    Configure planos, roles e recursos do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/financeiro")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financeiro
                  </CardTitle>
                  <CardDescription>
                    Acompanhe métricas financeiras e custos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/tickets")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Tickets
                  </CardTitle>
                  <CardDescription>
                    Gerenciar tickets de atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              {/* Novas Cards de Segurança 2FA */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/dashboard-seguranca")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Dashboard de Segurança 2FA
                  </CardTitle>
                  <CardDescription>
                    Monitore tentativas, IPs bloqueados e alertas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/historico-2fa")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HistoryIcon className="h-5 w-5" />
                    Histórico de Acessos 2FA
                  </CardTitle>
                  <CardDescription>
                    Auditoria completa de tentativas de autenticação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/ips-confiaveis")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    IPs Confiáveis
                  </CardTitle>
                  <CardDescription>
                    Gerencie whitelist de IPs que nunca serão bloqueados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Bloco de Enviar Notificações */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Enviar Notificações da Plataforma
                </CardTitle>
                <CardDescription>
                  Envie comunicados para usuários, agências ou clientes específicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSender />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Client User - Lista de Aprovações */}
        {profile?.role === 'client_user' && (
          <div className="space-y-6">
            {/* Botões de ação */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  if (!clientDataLoaded || !clients[0] || !agencies[0]) {
                    toast({
                      variant: "destructive",
                      title: "Aguarde",
                      description: "Os dados ainda estão sendo carregados. Tente novamente em instantes.",
                    });
                    return;
                  }
                  setRequestCreativeOpen(true);
                }}
                className="w-full sm:w-auto"
                disabled={!clientDataLoaded}
              >
                {!clientDataLoaded ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Solicitar Criativo
                  </>
                )}
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => {
                  const clientSlug = clients[0]?.slug;
                  const agencySlug = agencies[0]?.slug;
                  
                  if (!clientDataLoaded || !agencySlug || !clientSlug) {
                    toast({
                      variant: "destructive",
                      title: "Aguarde",
                      description: "Os dados ainda estão sendo carregados. Tente novamente em instantes.",
                    });
                    return;
                  }
                  
                  navigate(`/${agencySlug}/${clientSlug}`);
                }}
                className="w-full sm:w-auto"
                disabled={!clientDataLoaded}
              >
                {!clientDataLoaded ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4 mr-2" />
                    Ver Todos os Meus Conteúdos
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/meus-aprovadores')}
                className="w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Gerenciar Aprovadores
              </Button>
            </div>

            {/* Indicador de Quota de Criativos */}
            {(() => {
              const monthlyQuota = clients[0]?.monthly_creatives || 0;
              
              if (monthlyQuota === 0) return null;
              
              const now = new Date();
              const currentMonth = format(now, 'yyyy-MM');
              
              const currentMonthCreatives = contents.filter(c => {
                const contentMonth = format(new Date(c.date), 'yyyy-MM');
                return contentMonth === currentMonth;
              }).length;
              
              const remainingCreatives = monthlyQuota - currentMonthCreatives;
              const exceededCreatives = currentMonthCreatives > monthlyQuota ? currentMonthCreatives - monthlyQuota : 0;
              
              return (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Criativos contratados por mês: {monthlyQuota}</CardTitle>
                      </div>
                      <Badge variant={exceededCreatives > 0 ? "destructive" : remainingCreatives <= 2 ? "warning" : "default"}>
                        {currentMonthCreatives} / {monthlyQuota}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Enviados para aprovação:</span>
                        <span className="font-semibold">{currentMonthCreatives}</span>
                      </div>
                      
                      {exceededCreatives > 0 ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Cota de criativos contratados excedida</AlertTitle>
                          <AlertDescription>
                            Você excedeu a quota contratada em {exceededCreatives} criativo{exceededCreatives > 1 ? 's' : ''}. 
                            Entre em contato com a agência para ajustar seu plano.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Restantes na quota:</span>
                          <span className={`font-semibold ${remainingCreatives <= 2 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                            {remainingCreatives}
                          </span>
                        </div>
                      )}
                      
                      {remainingCreatives <= 2 && remainingCreatives > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Você está próximo do limite da sua quota mensal.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Solicitações Criativas */}
            {creativeRequests.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Solicitações</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {creativeRequests.map((request) => (
                    <Card key={request.id} className="transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{request.payload?.title || 'Sem título'}</CardTitle>
                            <CardDescription className="space-y-1">
                              <p>Solicitado em: {format(new Date(request.created_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                              <p>Tipo: {request.payload?.type || 'Não especificado'}</p>
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
                              
                              try {
                                const { error } = await supabase
                                  .from('notifications')
                                  .delete()
                                  .eq('id', request.id)
                                  .eq('event', 'novojob');

                                if (error) throw error;

                                toast({
                                  title: "Solicitação excluída",
                                  description: "A solicitação criativa foi removida com sucesso.",
                                });

                                setCreativeRequests(prev => prev.filter(r => r.id !== request.id));
                              } catch (error: any) {
                                console.error("Erro ao excluir solicitação:", error);
                                toast({
                                  variant: "destructive",
                                  title: "Erro",
                                  description: error?.message || "Não foi possível excluir a solicitação.",
                                });
                              }
                            }}
                            className="text-destructive hover:text-destructive/90"
                            title="Excluir solicitação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setEditingRequest(request);
                            setEditCreativeOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar solicitação
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const getNavigationSlugs = () => {
                const clientSlug = clients[0]?.slug;
                const agencySlug = agencies[0]?.slug;
                
                console.log('🔍 Navigation slugs:', { 
                  clientSlug, 
                  agencySlug,
                  hasClient: !!clients[0],
                  hasAgency: !!agencies[0],
                  clientId: clients[0]?.id,
                  agencyId: agencies[0]?.id
                });
                
                return { clientSlug, agencySlug };
              };

              return Object.entries(contentsByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([monthKey, monthContents]) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                
                const pendingContents = monthContents.filter(c => c.status === 'in_review' || c.status === 'draft');
                const partialContents = monthContents.filter(c => c.status === 'changes_requested');
                const approvedContents = monthContents.filter(c => c.status === 'approved');
                const rejectedContents = monthContents.filter(c => c.status === 'rejected');
                
                const client = clients[0];
                const agency = agencies[0];
              
              // Determinar o subtítulo baseado no status
              let subtitle = '';
              if (pendingContents.length > 0) {
                subtitle = `Você tem ${pendingContents.length} ${pendingContents.length === 1 ? 'conteúdo' : 'conteúdos'} para aprovar`;
              } else if (partialContents.length > 0) {
                subtitle = `${partialContents.length} ${partialContents.length === 1 ? 'conteúdo necessita' : 'conteúdos necessitam'} de ajustes`;
              } else if (approvedContents.length === monthContents.length) {
                subtitle = 'Tudo Aprovado ✓';
              }
              
              return (
                <Card key={monthKey}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="capitalize">{monthName}</CardTitle>
                        {subtitle && (
                          <CardDescription className="mt-1">{subtitle}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {pendingContents.length > 0 && (
                          <Badge className="bg-pending text-white border-0">
                            {pendingContents.length} pendente{pendingContents.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {approvedContents.length > 0 && (
                          <Badge className="bg-success text-white border-0">
                            {approvedContents.length} aprovado{approvedContents.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {partialContents.length > 0 && (
                          <Badge className="bg-warning text-white border-0">
                            {partialContents.length} ajuste{partialContents.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {rejectedContents.length > 0 && (
                          <Badge className="bg-destructive text-white border-0">
                            {rejectedContents.length} reprovado{rejectedContents.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingContents.length > 0 && (
                        <div className="space-y-2">{pendingContents.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-pending/5 border border-pending/20">
                            <div className="flex-1">
                              <p className="font-medium">{c.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(c.date), "dd/MM/yyyy", { locale: ptBR })}
                                {c.channels && c.channels.length > 0 && (
                                  <span className="ml-2">• {c.channels.join(', ')}</span>
                                )}
                              </p>
                            </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const { clientSlug, agencySlug } = getNavigationSlugs();
                      
                      if (!agencySlug || !clientSlug) {
                        toast({
                          variant: "destructive",
                          title: "Erro de navegação",
                          description: "Dados não carregados. Aguarde ou recarregue a página.",
                        });
                        return;
                      }
                      
                      navigate(`/${agencySlug}/${clientSlug}`);
                    }}
                  >
                    Revisar
                  </Button>
                          </div>
                        ))}</div>
                      )}
                      
                      {partialContents.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-warning">Ajustes Solicitados</h4>
                          {partialContents.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                              <div className="flex-1">
                                <p className="font-medium">{c.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(c.date), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const { clientSlug, agencySlug } = getNavigationSlugs();
                                  
                                  if (!agencySlug || !clientSlug) {
                                    toast({
                                      variant: "destructive",
                                      title: "Erro de navegação",
                                      description: `Não foi possível carregar os dados da ${!agencySlug ? 'agência' : 'conta'}. Por favor, recarregue a página.`,
                                    });
                                    console.error('Navigation failed - Missing slugs:', { 
                                      agencySlug, 
                                      clientSlug,
                                      agency: agencies[0],
                                      client: clients[0]
                                    });
                                    return;
                                  }
                                  
                                  navigate(`/${agencySlug}/${clientSlug}`);
                                }}
                              >
                                Ver detalhes
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>
            );
          });
        })()}
            <Alert>
              <AlertTitle>Workflow</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Todos os posts são agendados para publicação na sexta-feira (ou no último dia útil da semana).</li>
                  <li>O prazo para indicar posts com alterações simples ou que devem ser excluídos do agendamento é até quinta às 23h59 (ou no penúltimo dia útil da semana).</li>
                  <li>São alterações simples: correções de texto na legenda ou imagem ou a substituição de foto/imagem com o envio da mesma (por link ou arquivo).</li>
                  <li>Posts não aprovados serão automaticamente descartados das publicações da semana e incluídos como post adicional na próxima semana.</li>
                  <li>Todos os posts sem observações serão automaticamente aprovados para publicação.</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Painel de Agência com Tabs */}
        {profile?.role === 'agency_admin' && profile?.agency_id && (
          <>
            {console.log('🎨 Rendering Agency Tabs', { 
              role: profile.role, 
              agencyId: profile.agency_id, 
              clientsCount: clients.length 
            })}
            <Tabs defaultValue="clients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="clients">
                <Building2 className="w-4 h-4 mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="metrics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <FileImage className="w-4 h-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Equipe
              </TabsTrigger>
            </TabsList>

            {/* Aba de Clientes */}
            <TabsContent value="clients">
              <div className="space-y-6">
                {/* Card de Tickets */}
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/agencia/tickets")}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Tickets de Suporte
                    </CardTitle>
                    <CardDescription>
                      Gerenciar seus tickets e tickets dos seus clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Acessar
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" />
                    <h3 className="text-2xl font-bold">Clientes</h3>
                  </div>
                  <div className="flex gap-2">
                    {profile?.role === 'agency_admin' && profile?.agency_id && (
                      <AddClientDialog 
                        agencyId={profile.agency_id} 
                        onClientAdded={fetchClients} 
                      />
                    )}
                  </div>
                </div>
            {clients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem clientes. Adicione o primeiro para começar a cadastrar conteúdos.
                  </p>
                  {profile?.role === 'agency_admin' && profile?.agency_id && (
                    <AddClientDialog 
                      agencyId={profile.agency_id} 
                      onClientAdded={fetchClients} 
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client) => {
                  const agency = getClientAgency(client.agency_id);
                  const notifications = clientNotifications[client.id] || { adjustments: 0, approved: 0, rejected: 0, creatives: 0, new: 0 };
                  const hasNotifications = notifications.new > 0 || notifications.adjustments > 0 || notifications.approved > 0 || notifications.rejected > 0;
                  
                  return (
                    <Card 
                      key={client.id} 
                      className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        // Prevenir navegação se clicar em botões internos
                        if ((e.target as HTMLElement).closest('button')) {
                          return;
                        }
                        navigate(`/clientes/${client.id}`);
                      }}
                    >
                      {/* Notificações no topo com links */}
                      {hasNotifications && (
                        <div className="bg-muted/50 p-3">
                          <div className="flex flex-wrap gap-2">
                            {notifications.new > 0 && (
                              <Badge 
                                className="gap-1.5 bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 cursor-pointer"
                                onClick={() => navigate(`/agency/creative-requests/${client.id}`)}
                              >
                                <Sparkles className="w-3 h-3" />
                                {notifications.new} Solicitaç{notifications.new > 1 ? 'ões' : 'ão'}
                              </Badge>
                            )}
                            {notifications.adjustments > 0 && (
                              <Badge 
                                className="gap-1.5 bg-orange-600 text-white border-orange-600 hover:bg-orange-700 cursor-pointer"
                                onClick={() => {
                                  const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                                  if (aSlug) navigate(`/${aSlug}/${client.slug}`);
                                }}
                              >
                                <AlertCircle className="w-3 h-3" />
                                {notifications.adjustments} Ajuste{notifications.adjustments > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {notifications.approved > 0 && (
                              <Badge 
                                className="gap-1.5 bg-green-600 text-white border-green-600 hover:bg-green-700 cursor-pointer"
                                onClick={() => {
                                  const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                                  if (aSlug) navigate(`/${aSlug}/${client.slug}`);
                                }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {notifications.approved} Aprovado{notifications.approved > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {notifications.rejected > 0 && (
                              <Badge 
                                className="gap-1.5 bg-red-600 text-white border-red-600 hover:bg-red-700 cursor-pointer"
                                onClick={() => {
                                  const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                                  if (aSlug) navigate(`/${aSlug}/${client.slug}`);
                                }}
                              >
                                <XCircle className="w-3 h-3" />
                                {notifications.rejected} Reprovado{notifications.rejected > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <CardContent className="p-6">
                        {/* Linha com dados do cliente */}
                        <div className="flex items-center gap-4 mb-6">
                          {client.logo_url && (
                            <img 
                              src={client.logo_url} 
                              alt={client.name}
                              className="h-12 w-12 object-contain"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{client.name}</h3>
                            {(client as any).monthly_creatives > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {(client as any).monthly_creatives} criativos/mês
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Duas colunas de botões */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Coluna Esquerda - Dados do Cliente */}
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setSelectedClient(client);
                                setViewClientOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Dados
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => navigate(`/client/${client.id}/history`)}
                            >
                              <HistoryIcon className="w-4 h-4 mr-2" />
                              Histórico
                            </Button>
                            {profile?.role === 'agency_admin' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setEditClientOpen(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => handleDeleteClient(client)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remover Cliente
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Coluna Direita - Botões de Conteúdo */}
                          <div className="space-y-2">
                            
                            <Button
                              variant="success"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug || agency?.slug;
                                if (aSlug && client.slug) {
                                  navigate(`/${aSlug}/${client.slug}`);
                                }
                              }}
                            >
                              <FileImage className="w-4 w-4 mr-2" />
                              Revisar
                            </Button>
                            
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => navigate(`/agency-content`)}
                            >
                              <FileImage className="w-4 h-4 mr-2" />
                              Conteúdos
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => navigate(`/agency-content`)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovar Criativos
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => navigate(`/agency/creative-requests`)}
                            >
                              <HistoryIcon className="w-4 h-4 mr-2" />
                              Solicitações
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => navigate(`/client/${client.id}/history`)}
                            >
                              <HistoryIcon className="w-4 h-4 mr-2" />
                              Aprovação
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}

                {/* Seção Segurança e Gestão - Agency Admin */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="h-6 w-6" />
                    Segurança e Gestão
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card 
                      className="hover:shadow-lg transition-shadow cursor-pointer" 
                      onClick={() => navigate("/admin/historico-2fa")}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HistoryIcon className="h-5 w-5" />
                          Histórico de Acessos 2FA
                        </CardTitle>
                        <CardDescription>
                          Veja todas as tentativas de autenticação
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Acessar
                        </Button>
                      </CardContent>
                    </Card>

                    <Card 
                      className="hover:shadow-lg transition-shadow cursor-pointer" 
                      onClick={() => navigate("/admin/sessoes-ativas")}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Sessões Ativas
                        </CardTitle>
                        <CardDescription>
                          Gerencie sessões ativas de aprovadores
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Acessar
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba de Métricas */}
            <TabsContent value="metrics">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">Métricas de Uso</h3>
                </div>
                {profile?.agency_id && (
                  <AgencyLimitsOverview agencyId={profile.agency_id} />
                )}
              </div>
            </TabsContent>

            {/* Aba de Kanban */}
            <TabsContent value="kanban">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Quadro Kanban</h2>
                    <p className="text-sm text-muted-foreground">
                      Gerencie o fluxo de trabalho dos seus conteúdos
                    </p>
                  </div>
                  {profile?.agency_id && (
                    <KanbanColumnManager agencyId={profile.agency_id} />
                  )}
                </div>
                <ContentKanban agencyId={profile.agency_id!} />
              </div>
            </TabsContent>

            {/* Aba de Agenda Geral */}
            <TabsContent value="calendar">
              <AgencyCalendar agencyId={profile.agency_id!} />
            </TabsContent>

            {/* Aba de Equipe */}
            <TabsContent value="team">
              <TeamMembersManager />
            </TabsContent>
          </Tabs>
          </>
        )}



        {/* Recursos - Só para Super Admin */}
        {profile?.role === 'super_admin' && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Recursos do Sistema
                </CardTitle>
                <CardDescription>
                  Monitore o uso de recursos do Lovable Cloud
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceUsagePanel />
              </CardContent>
            </Card>
          </div>
        )}

        {clients.length === 0 && agencies.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum cliente ou agência encontrado
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <ViewClientDialog 
        client={selectedClient}
        open={viewClientOpen}
        onOpenChange={setViewClientOpen}
      />

      <EditClientDialog 
        client={selectedClient}
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        onSuccess={checkAuth}
      />

      {selectedClient && profile?.role === 'agency_admin' && (
        <ContentCategorySelector
          open={monthSelectorOpen}
          onOpenChange={setMonthSelectorOpen}
          onSelect={(category) => {
            setMonthSelectorOpen(false);
            navigate(`/agency/client/${selectedClient.id}?category=${category}`);
          }}
        />
      )}
      
      {selectedClient && profile?.role !== 'agency_admin' && (
        <MonthSelectorDialog
          clientId={selectedClient.id}
          clientSlug={selectedClient.slug}
          agencySlug={getClientAgency(selectedClient.agency_id)?.slug || ""}
          open={monthSelectorOpen}
          onOpenChange={setMonthSelectorOpen}
          isAgencyView={false}
        />
      )}
      
      
      <UserProfileDialog 
        user={user} 
        profile={profile} 
        onUpdate={checkAuth}
        open={openProfileDialog}
        onOpenChange={setOpenProfileDialog}
      />

      {openViewAgencyId && agencies.find(a => a.id === openViewAgencyId) && (
        <ViewAgencyDialog 
          agency={agencies.find(a => a.id === openViewAgencyId)!}
          open={true}
          onOpenChange={(o) => !o && setOpenViewAgencyId(null)}
        />
      )}
      
      {openEditAgencyId && agencies.find(a => a.id === openEditAgencyId) && (
        <EditAgencyDialog 
          agency={agencies.find(a => a.id === openEditAgencyId)!}
          onAgencyUpdated={checkAuth}
          open={true}
          onOpenChange={(o) => !o && setOpenEditAgencyId(null)}
        />
      )}

      {profile?.role === 'client_user' && (
        <RequestCreativeDialog
          open={requestCreativeOpen && clientDataLoaded && !!clients[0] && !!agencies[0]}
          onOpenChange={(open) => {
            if (open && (!clients[0] || !agencies[0])) {
              toast({
                variant: "destructive",
                title: "Dados incompletos",
                description: "Aguarde o carregamento dos dados ou recarregue a página.",
              });
              return;
            }
            setRequestCreativeOpen(open);
            if (!open) checkAuth();
          }}
          clientId={clients[0]?.id || ''}
          agencyId={agencies[0]?.id || ''}
        />
      )}

      <CreativeRequestDialog
        open={showCreativeRequestDialog}
        onOpenChange={setShowCreativeRequestDialog}
        request={selectedCreativeRequest}
      />

      <EditCreativeRequestDialog
        open={editCreativeOpen}
        onOpenChange={(open) => {
          setEditCreativeOpen(open);
          if (!open) {
            setEditingRequest(null);
            checkAuth();
          }
        }}
        request={editingRequest}
      />
      
      <AppFooter />
    </div>
  );
};

export default Dashboard;
