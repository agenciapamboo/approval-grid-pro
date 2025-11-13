import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SendPlatformNotificationDialog } from "@/components/admin/SendPlatformNotificationDialog";
import { ArrowLeft, Search, Users, Building2, Eye, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AccessGate from "@/components/auth/AccessGate";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  agency_id: string;
  agencies?: {
    name: string;
    slug: string;
  };
}

const Clientes = () => {
  const navigate = useNavigate();
  const { profile, role, loading: userDataLoading } = useUserData();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  useEffect(() => {
    if (userDataLoading || !profile) return;
    loadData();
  }, [userDataLoading, profile, role]);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('clients')
        .select(`
          id,
          name,
          slug,
          logo_url,
          agency_id,
          agencies (
            name,
            slug
          )
        `);

      if (role === 'super_admin') {
        // Sem filtro - ver todos os clientes
      } else if (role === 'agency_admin') {
        if (!profile?.agency_id) {
          toast.error('Você não está vinculado a nenhuma agência');
          setClients([]);
          setLoading(false);
          return;
        }
        query = query.eq('agency_id', profile.agency_id);
      } else {
        // Outros roles não acessam esta página (AccessGate já bloqueia)
        setClients([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar clientes');
        setClients([]);
      } else {
        setClients(data || []);
      }

    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredClients(filtered);
  };

  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
        <AppHeader userName={profile?.name} userRole={role || undefined} onSignOut={() => navigate("/auth")} />

        <main className="flex-1 container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>

            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Clientes
              </h1>
              <p className="text-muted-foreground">
                Gerencie seus clientes e acompanhe suas métricas
              </p>
            </div>

            {role === 'super_admin' && (
              <div className="mt-4">
                <Button
                  onClick={() => setNotificationDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar Notificação
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Clientes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    clients.length
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  clientes ativos
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Search className="h-5 w-5" />
                Buscar Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Digite o nome ou slug do cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  Nenhum cliente encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="group bg-card/50 backdrop-blur border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => navigate(`/cliente/${client.slug}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                          {client.name}
                        </CardTitle>
                        <Badge variant="outline" className="mb-2">
                          @{client.slug}
                        </Badge>
                        {client.agencies && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Building2 className="h-4 w-4" />
                            <span>{client.agencies.name}</span>
                          </div>
                        )}
                      </div>
                      {client.logo_url && (
                        <img
                          src={client.logo_url}
                          alt={client.name}
                          className="w-12 h-12 rounded-lg object-cover border border-border/50"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <AppFooter />

        <SendPlatformNotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
        />
      </div>
    </AccessGate>
  );
};

export default Clientes;
