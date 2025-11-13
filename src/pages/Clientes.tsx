import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SendPlatformNotificationDialog } from "@/components/admin/SendPlatformNotificationDialog";
import { ArrowLeft, Search, Users, Building2, Eye, Send, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const { role, can, loading: authLoading } = usePermissions();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Esperar autenticação carregar
    if (authLoading) return;
    
    // Validação simples de role
    if (!can('manage_clients')) {
      toast.error('Acesso negado');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [role, authLoading, navigate]);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadData = async () => {
    try {
      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      
      if (!profileData) {
        toast.error('Perfil não encontrado');
        navigate('/auth');
        return;
      }
      
      setProfile(profileData);

      // RLS filtra automaticamente por agency_id para agency_admin
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          agencies (
            id,
            name,
            slug
          )
        `)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast.error('Erro ao carregar clientes');
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
                Gerencie todos os clientes
              </p>
            </div>
            {role === 'super_admin' && (
              <Button onClick={() => setNotificationDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Notificação
              </Button>
            )}
          </div>

          {/* Card de Resumo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{clients.length}</p>
            </CardContent>
          </Card>

          {/* Filtro de Busca */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
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
        agencyId={profile?.agency_id}
      />

      <AppFooter />
    </div>
  );
};

export default Clientes;
