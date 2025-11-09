import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { ArrowLeft, Building2, Users, Calendar, Mail, Phone, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditAgencyDialog } from "@/components/admin/EditAgencyDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  plan?: string | null;
  plan_type?: "monthly" | "annual" | null;
  plan_renewal_date?: string | null;
  last_payment_date?: string | null;
  created_at?: string;
  email?: string | null;
  whatsapp?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
}

const AgenciaDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verificar permissão
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (roleData !== 'super_admin') {
        toast.error("Acesso negado");
        navigate("/dashboard");
        return;
      }

      // Carregar agência
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", id)
        .single();

      if (agencyError) {
        console.error("Erro ao carregar agência:", agencyError);
        toast.error("Erro ao carregar agência");
        navigate("/agencias");
        return;
      }

      setAgency(agencyData as Agency);

      // Carregar clientes da agência
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, slug, logo_url")
        .eq("agency_id", id)
        .order("name");

      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agency) return;

    if (!window.confirm(`⚠️ ATENÇÃO: Deseja excluir a agência "${agency.name}"?\n\nEsta ação irá remover:\n- A agência\n- Todos os usuários da agência\n- Todos os clientes\n- Todos os conteúdos e arquivos\n\nEsta ação NÃO pode ser desfeita!`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("agencies")
        .delete()
        .eq("id", agency.id);

      if (error) throw error;

      toast.success("Agência removida com sucesso");
      navigate("/agencias");
    } catch (error) {
      console.error("Erro ao remover agência:", error);
      toast.error("Erro ao remover agência");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Agência não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/agencias")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Agências
        </Button>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={agency.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-2xl">{agency.name}</CardTitle>
                    <CardDescription>@{agency.slug}</CardDescription>
                    <Badge variant="default" className="mt-2">
                      {agency.plan || "free"} {agency.plan_type && `(${agency.plan_type})`}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-semibold">Informações de Contato</h3>
                  {agency.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{agency.email}</span>
                    </div>
                  )}
                  {agency.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{agency.whatsapp}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Informações de Pagamento</h3>
                  {agency.plan_renewal_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Renovação: {format(new Date(agency.plan_renewal_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {agency.last_payment_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Último pagamento: {format(new Date(agency.last_payment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes ({clients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clients.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {clients.map((client) => (
                    <Card key={client.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={client.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <Users className="h-5 w-5 text-secondary-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">@{client.slug}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum cliente cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <AppFooter />

      {editDialogOpen && (
        <EditAgencyDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          agency={agency}
          onAgencyUpdated={loadData}
        />
      )}
    </div>
  );
};

export default AgenciaDetalhes;
