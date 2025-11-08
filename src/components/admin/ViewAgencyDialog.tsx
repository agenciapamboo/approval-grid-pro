import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Building2, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
  email?: string;
  whatsapp?: string;
  plan?: string;
  plan_renewal_date?: string;
  created_at?: string;
}

interface ViewAgencyDialogProps {
  agency: Agency;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ViewAgencyDialog({ agency, open, onOpenChange, trigger }: ViewAgencyDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAgencyData();
    }
  }, [open, agency.id]);

  const loadAgencyData = async () => {
    setLoading(true);
    try {
      // Buscar clientes da agência
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agency.id);
      
      if (clientsData) setClients(clientsData);

      // Buscar usuários da agência
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("agency_id", agency.id);
      
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error("Error loading agency data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.plan && c.plan !== 'free').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Ver
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {agency.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            {agency.logo_url && (
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img 
                  src={agency.logo_url} 
                  alt={agency.name}
                  className="h-20 object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Total de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totalClients}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Clientes Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{activeClients}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{users.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-sm capitalize">{agency.plan || 'free'}</Badge>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Dados Cadastrais</h3>
                <div className="grid gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Slug</label>
                    <p className="text-base font-mono text-sm">{agency.slug}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{agency.email || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                    <p className="text-base">{agency.whatsapp || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Identidade Visual</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cor Primária</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: agency.brand_primary || '#2563eb' }}
                      />
                      <p className="text-sm font-mono">{agency.brand_primary || '#2563eb'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cor Secundária</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: agency.brand_secondary || '#8b5cf6' }}
                      />
                      <p className="text-sm font-mono">{agency.brand_secondary || '#8b5cf6'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Clientes */}
          <TabsContent value="clients" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : clients.length > 0 ? (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{client.slug}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
            )}
          </TabsContent>

          {/* Tab: Usuários */}
          <TabsContent value="users" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : users.length > 0 ? (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            )}
          </TabsContent>

          {/* Tab: Financeiro */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    MRR Estimado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeClients * 150)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeClients} clientes ativos × R$ 150
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">R$ 150</p>
                </CardContent>
              </Card>

              {agency.plan_renewal_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Renovação</label>
                  <p className="text-base">
                    {new Date(agency.plan_renewal_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
