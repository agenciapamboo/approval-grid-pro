import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Users, Building2, FileImage, ArrowRight, MessageSquare, Eye, Pencil, Plus, AlertCircle, CheckCircle, Trash2, Sparkles, Clock } from "lucide-react";
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
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { TestNotificationButton } from "@/components/admin/TestNotificationButton";



interface Profile {
  id: string;
  name: string;
  role: string;
  agency_id: string | null;
  client_id: string | null;
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
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewClientOpen, setViewClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
  const [contents, setContents] = useState<Content[]>([]);
  const [contentsByMonth, setContentsByMonth] = useState<Record<string, Content[]>>({});
  const [clientNotifications, setClientNotifications] = useState<Record<string, { adjustments: number; approved: number; rejected: number }>>({});
  const [openViewAgencyId, setOpenViewAgencyId] = useState<string | null>(null);
  const [openEditAgencyId, setOpenEditAgencyId] = useState<string | null>(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [requestCreativeOpen, setRequestCreativeOpen] = useState(false);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Fetch profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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

      setProfile(profileData);

      // Carregar dados baseado no role
      if (profileData.role === 'super_admin') {
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
      } else if (profileData.role === 'agency_admin' && profileData.agency_id) {
        // Agency admin vê sua agência e clientes
        const { data: agencyData } = await supabase
          .from("agencies")
          .select("*")
          .eq("id", profileData.agency_id)
          .single();
        
        if (agencyData) setAgencies([agencyData]);

        const { data: clientsData } = await supabase
          .from("clients")
          .select("*")
          .eq("agency_id", profileData.agency_id)
          .order("name");
        
        if (clientsData) {
          setClients(clientsData);
          
          // Buscar notificações de conteúdo para cada cliente
          const notifications: Record<string, { adjustments: number; approved: number; rejected: number }> = {};
          
          for (const client of clientsData) {
            const { data: contentsData } = await supabase
              .from("contents")
              .select("status")
              .eq("client_id", client.id);
            
            if (contentsData) {
              notifications[client.id] = {
                adjustments: contentsData.filter(c => c.status === 'changes_requested').length,
                approved: contentsData.filter(c => c.status === 'approved').length,
                rejected: contentsData.filter(c => c.status === 'in_review').length,
              };
            }
          }
          
          setClientNotifications(notifications);
        }
      } else if (profileData.role === 'client_user' && profileData.client_id) {
        // Client user vê seu cliente
        const { data: clientData } = await supabase
          .from("clients")
          .select("*, agencies(*)")
          .eq("id", profileData.client_id)
          .single();
        
        if (clientData) {
          setClients([clientData]);
          if (clientData.agencies) {
            setAgencies([clientData.agencies as any]);
          }
        }

        // Buscar conteúdos do cliente
        const { data: contentsData } = await supabase
          .from("contents")
          .select("*")
          .eq("client_id", profileData.client_id)
          .order("date", { ascending: false });
        
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
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
              {profile?.role === 'super_admin' && 'Gerencie todas as agências e clientes da plataforma'}
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
            {(profile?.role === 'agency_admin' || profile?.role === 'super_admin') && (
              <TestNotificationButton />
            )}
          </div>
        </div>

        {/* Client User - Lista de Aprovações */}
        {profile?.role === 'client_user' && (
          <div className="space-y-6">
            {Object.entries(contentsByMonth).map(([monthKey, monthContents]) => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              
              const pendingContents = monthContents.filter(c => c.status === 'in_review' || c.status === 'draft');
              const partialContents = monthContents.filter(c => c.status === 'changes_requested');
              const approvedContents = monthContents.filter(c => c.status === 'approved');
              
              const client = clients[0];
              const agency = agencies[0];
              
              return (
                <div key={monthKey} className="space-y-4">
                  <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                  
                  {pendingContents.length > 0 && (
                    <Card className="border-l-4 border-l-pending">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-pending" />
                          <CardTitle className="text-base">🕓 Aprovação Pendente</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between p-3 glass rounded-lg">
                          <div>
                            <p className="font-medium">Conteúdo pendente</p>
                            <p className="text-sm text-muted-foreground">
                              Você tem {pendingContents.length} para aprovar
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const c = clients[0];
                              const aSlug = c?.agencies?.slug || agencies[0]?.slug || 'agencia';
                              if (c?.slug) {
                                navigate(`/${aSlug}/${c.slug}?month=${month}&year=${year}`);
                              }
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {partialContents.length > 0 && (
                    <Card className="border-l-4 border-l-warning">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-warning" />
                          <CardTitle className="text-base">🔁 Aguardando Revisão da Agência</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {partialContents.map(content => (
                          <div 
                            key={content.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{content.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(content.date).toLocaleDateString('pt-BR')} - {content.type}
                              </p>
                            </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const c = clients[0];
                                  const aSlug = c?.agencies?.slug || agencies[0]?.slug || 'agencia';
                                  if (c?.slug) {
                                    navigate(`/${aSlug}/${c.slug}?month=${month}&year=${year}`);
                                  }
                                }}
                              >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {approvedContents.length > 0 && (
                    <Card className="border-l-4 border-l-success">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <CardTitle className="text-base">✔️ Aprovado</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {approvedContents.map(content => (
                          <div 
                            key={content.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{content.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(content.date).toLocaleDateString('pt-BR')} - {content.type}
                              </p>
                            </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const c = clients[0];
                                  const aSlug = c?.agencies?.slug || agencies[0]?.slug || 'agencia';
                                  if (c?.slug) {
                                    navigate(`/${aSlug}/${c.slug}?month=${month}&year=${year}`);
                                  }
                                }}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
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

        {/* Clientes - Para Admin e Agency Admin */}
        {profile?.role !== 'client_user' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">Clientes</h3>
              </div>
              {profile?.role === 'agency_admin' && profile?.agency_id && (
                <AddClientDialog 
                  agencyId={profile.agency_id} 
                  onClientAdded={fetchClients} 
                />
              )}
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
                  const notifications = clientNotifications[client.id] || { adjustments: 0, approved: 0, rejected: 0 };
                  const hasNotifications = notifications.adjustments > 0 || notifications.approved > 0 || notifications.rejected > 0;
                  
                  return (
                    <Card 
                      key={client.id} 
                      className="relative overflow-hidden"
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex-1 cursor-pointer" 
                            onClick={() => {
                              const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                              if (aSlug) navigate(`/${aSlug}/${client.slug}`);
                            }}
                          >
                            {client.logo_url && (
                              <img 
                                src={client.logo_url} 
                                alt={client.name}
                                className="h-12 mb-3 object-contain"
                              />
                            )}
                            <CardTitle className="text-lg">{client.name}</CardTitle>
                            {agency && (
                              <CardDescription className="text-sm mt-1">
                                {agency.name}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {hasNotifications && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {notifications.adjustments > 0 && (
                                  <Badge variant="warning" className="cursor-pointer">
                                    <AlertCircle className="h-3 w-3" />
                                    {notifications.adjustments} Ajuste{notifications.adjustments > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {notifications.approved > 0 && (
                                  <Badge variant="success" className="cursor-pointer">
                                    <CheckCircle className="h-3 w-3" />
                                    {notifications.approved} Aprovado{notifications.approved > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {notifications.rejected > 0 && (
                                  <Badge variant="pending" className="cursor-pointer">
                                    <Clock className="h-3 w-3" />
                                    {notifications.rejected} Pendente{notifications.rejected > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                                setViewClientOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Dados
                            </Button>
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                                setMonthSelectorOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovação
                            </Button>
                            {profile?.role === 'agency_admin' && (
                              <>
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                                    if (aSlug) navigate(`/${aSlug}/${client.slug}`);
                                  }}
                                >
                                  <FileImage className="w-4 h-4 mr-2" />
                                  Ver conteúdo
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClient(client);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {client.plan_renewal_date && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                              Última atualização: {new Date(client.plan_renewal_date).toLocaleDateString('pt-BR')} às {new Date(client.plan_renewal_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* Agências - Só para Super Admin */}
        {profile?.role === 'super_admin' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold">Agências</h3>
              </div>
              <AddAgencyDialog onAgencyAdded={checkAuth} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.map((agency) => (
                <Card key={agency.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {agency.logo_url && (
                          <div className="mb-3">
                            <img 
                              src={agency.logo_url} 
                              alt={agency.name}
                              className="h-16 max-w-[200px] object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg truncate">{agency.name}</CardTitle>
                          <CardDescription className="text-xs mt-1 truncate">
                            Slug: {agency.slug}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setOpenViewAgencyId(agency.id)}
                          className="w-full justify-start"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setOpenEditAgencyId(agency.id)}
                          className="w-full justify-start"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAgency(agency);
                          }}
                          className="w-full justify-start"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </div>
                </CardHeader>
                </Card>
              ))}
            </div>
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

      {profile?.role === 'client_user' && clients[0] && agencies[0] && (
        <RequestCreativeDialog
          open={requestCreativeOpen}
          onOpenChange={setRequestCreativeOpen}
          clientId={clients[0].id}
          agencyId={agencies[0].id}
        />
      )}
      
      <AppFooter />
    </div>
  );
};

export default Dashboard;
