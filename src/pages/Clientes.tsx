import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "@/hooks/useUserData";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SendPlatformNotificationDialog } from "@/components/admin/SendPlatformNotificationDialog";
import { ArrowLeft, Search, Users, Building2, Eye, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AccessGate from "@/components/auth/AccessGate";
import { AppLayout } from "@/components/layout/AppLayout";

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
      <AppLayout>
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
              Clientes
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie seus clientes e acompanhe suas métricas
            </p>

            {role === 'super_admin' && (
              <SendPlatformNotificationDialog
                open={notificationDialogOpen}
                onOpenChange={setNotificationDialogOpen}
              />
            )}
          </div>

          <Card className="mb-4 md:mb-6 bg-card/50 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-3 md:pb-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    Total de Clientes
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-1">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      `${clients.length} clientes ativos`
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="mb-4 md:mb-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Digite o nome ou slug do cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50"
              />
            </div>
            {role === 'super_admin' && (
              <Button
                onClick={() => setNotificationDialogOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar Notificação
              </Button>
            )}
          </div>

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
                  onClick={() => navigate(`/cliente/${client.id}`)}
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

          <SendPlatformNotificationDialog
            open={notificationDialogOpen}
            onOpenChange={setNotificationDialogOpen}
          />
        </div>
      </AppLayout>
    </AccessGate>
  );
};

export default Clientes;
