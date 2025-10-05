import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Users, Building2, FileImage, ArrowRight, MessageSquare, Eye, Pencil, Plus, AlertCircle, CheckCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { AddAgencyDialog } from "@/components/admin/AddAgencyDialog";
import { UserProfileDialog } from "@/components/admin/UserProfileDialog";
import { ViewAgencyDialog } from "@/components/admin/ViewAgencyDialog";
import { EditAgencyDialog } from "@/components/admin/EditAgencyDialog";
import { ViewClientDialog } from "@/components/admin/ViewClientDialog";
import { EditClientDialog } from "@/components/admin/EditClientDialog";
import { MonthSelectorDialog } from "@/components/admin/MonthSelectorDialog";
import { AddClientDialog } from "@/components/admin/AddClientDialog";

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
                rejected: contentsData.filter(c => c.status === 'draft').length,
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
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <FileImage className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-poppins text-xl font-bold">Aprova Criativos</h1>
              <p className="text-sm text-muted-foreground">Sistema de Aprovação de Conteúdos</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(profile?.role || "")}</p>
            </div>
            <UserProfileDialog user={user} profile={profile} onUpdate={checkAuth} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Bem-vindo, {profile?.name}!
          </h2>
          <p className="text-muted-foreground">
            {profile?.role === 'super_admin' && 'Gerencie todas as agências e clientes da plataforma'}
            {profile?.role === 'agency_admin' && 'Gerencie os clientes da sua agência'}
            {profile?.role === 'client_user' && 'Revise e aprove seus conteúdos.'}
          </p>
        </div>

        {/* Client User - Lista de Aprovações */}
        {profile?.role === 'client_user' && (
          <div className="space-y-6">
            {Object.entries(contentsByMonth).map(([monthKey, monthContents]) => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              
              const pendingContents = monthContents.filter(c => c.status === 'pending' || c.status === 'draft');
              const partialContents = monthContents.filter(c => c.status === 'revision');
              const approvedContents = monthContents.filter(c => c.status === 'approved');
              
              const client = clients[0];
              const agency = agencies[0];
              
              return (
                <div key={monthKey} className="space-y-4">
                  <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                  
                  {pendingContents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Aprovação Pendente</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Conteúdo pendende</p>
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
                                navigate(`/a/${aSlug}/c/${c.slug}?month=${month}&year=${year}`);
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Parcialmente Aprovado</CardTitle>
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
                                  navigate(`/a/${aSlug}/c/${c.slug}?month=${month}&year=${year}`);
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Aprovado</CardTitle>
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
                                    navigate(`/a/${aSlug}/c/${c.slug}?month=${month}&year=${year}`);
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
        {profile?.role !== 'client_user' && clients.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Clientes</h3>
              </div>
              {profile?.role === 'agency_admin' && profile?.agency_id && (
                <AddClientDialog 
                  agencyId={profile.agency_id} 
                  onClientAdded={fetchClients} 
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => {
                const agency = getClientAgency(client.agency_id);
                const notifications = clientNotifications[client.id] || { adjustments: 0, approved: 0, rejected: 0 };
                const hasNotifications = notifications.adjustments > 0 || notifications.approved > 0 || notifications.rejected > 0;
                
                return (
                  <Card 
                    key={client.id} 
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div 
                          className="flex-1 cursor-pointer" 
                          onClick={() => {
                            const aSlug = client.agencies?.slug || getClientAgency(client.agency_id)?.slug;
                            if (aSlug) navigate(`/a/${aSlug}/c/${client.slug}`);
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
                            <div className="space-y-1 mb-2">
                              {notifications.adjustments > 0 && (
                                <Alert className="py-2 px-3">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    {notifications.adjustments} Ajuste{notifications.adjustments > 1 ? 's' : ''} Solicitado{notifications.adjustments > 1 ? 's' : ''}
                                  </AlertDescription>
                                </Alert>
                              )}
                              {notifications.approved > 0 && (
                                <Alert className="py-2 px-3 border-green-500 text-green-700">
                                  <CheckCircle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    {notifications.approved} Conteúdo{notifications.approved > 1 ? 's' : ''} Aprovado{notifications.approved > 1 ? 's' : ''}
                                  </AlertDescription>
                                </Alert>
                              )}
                              {notifications.rejected > 0 && (
                                <Alert className="py-2 px-3 border-red-500 text-red-700">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    {notifications.rejected} Conteúdo{notifications.rejected > 1 ? 's' : ''} Reprovado{notifications.rejected > 1 ? 's' : ''}
                                  </AlertDescription>
                                </Alert>
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
                          {profile?.role === 'agency_admin' && (
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
                          )}
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                              setMonthSelectorOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Aprovação
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        )}


        {/* Agências - Só para Super Admin */}
        {profile?.role === 'super_admin' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Agências</h3>
              </div>
              <AddAgencyDialog onAgencyAdded={checkAuth} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.map((agency) => (
                <Card key={agency.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {agency.logo_url && (
                          <img 
                            src={agency.logo_url} 
                            alt={agency.name}
                            className="h-10 object-contain"
                          />
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{agency.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Slug: {agency.slug}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <ViewAgencyDialog agency={agency} />
                        <EditAgencyDialog agency={agency} onAgencyUpdated={checkAuth} />
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Mensagem
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

      <MonthSelectorDialog
        clientId={selectedClient?.id || ""}
        clientSlug={selectedClient?.slug || ""}
        agencySlug={getClientAgency(selectedClient?.agency_id || "")?.slug || ""}
        open={monthSelectorOpen}
        onOpenChange={setMonthSelectorOpen}
      />

      <footer className="border-t bg-card/50 backdrop-blur-sm mt-8">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center font-poppins text-sm">
            <span className="font-normal">Desenvolvido com </span>
            <span className="text-[#FFD700]">💛</span>
            <span className="font-normal"> por </span>
            <a 
              href="https://agenciapamboo.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold hover:underline"
            >
              Pamboo Criativos
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
