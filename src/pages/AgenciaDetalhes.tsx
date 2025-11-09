import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { ArrowLeft, Building2, Users, Calendar, Mail, Phone, Edit, Trash2, Lock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { EditAgencyDialog } from "@/components/admin/EditAgencyDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PLAN_DISPLAY_NAMES } from "@/lib/stripe-config";

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

const getPlanDisplayName = (plan?: string | null): string => {
  if (!plan) return 'Free';
  const key = plan.toLowerCase();
  if (key === 'free') return 'Free';
  return PLAN_DISPLAY_NAMES[key as keyof typeof PLAN_DISPLAY_NAMES] || plan;
};

const AgenciaDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly');
  const [changingPlan, setChangingPlan] = useState(false);

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
                      {getPlanDisplayName(agency.plan)}
                      {agency.plan_type && ` (${agency.plan_type === 'monthly' ? 'Mensal' : 'Anual'})`}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setChangePlanOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Alterar Plano
                  </Button>
                  <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
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

      <Dialog open={changePlanOpen} onOpenChange={(open) => {
        setChangePlanOpen(open);
        if (!open) {
          setSelectedPlan('');
          setSelectedCycle('monthly');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              Selecione o novo plano para {agency.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Plano</label>
              <Select
                value={selectedPlan || agency.plan || 'free'}
                onValueChange={setSelectedPlan}
                disabled={changingPlan}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="creator">Creator (Gratuito)</SelectItem>
                  <SelectItem value="eugencia">Eugência</SelectItem>
                  <SelectItem value="socialmidia">Social Mídia</SelectItem>
                  <SelectItem value="fullservice">Full Service</SelectItem>
                  <SelectItem value="unlimited">Unlimited (Interno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && !['free', 'creator', 'unlimited'].includes(selectedPlan) && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Ciclo de Cobrança</label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCycle('monthly')}
                    disabled={changingPlan}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedCycle === 'monthly'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCycle === 'monthly' ? 'border-primary' : 'border-border'
                      }`}>
                        {selectedCycle === 'monthly' && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="font-medium">Mensal</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedPlan === 'eugencia' && 'R$ 29,70/mês'}
                      {selectedPlan === 'socialmidia' && 'R$ 49,50/mês'}
                      {selectedPlan === 'fullservice' && 'R$ 97,20/mês'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCycle('annual')}
                    disabled={changingPlan}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedCycle === 'annual'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCycle === 'annual' ? 'border-primary' : 'border-border'
                      }`}>
                        {selectedCycle === 'annual' && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Anual</span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary">
                          10% OFF
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedPlan === 'eugencia' && 'R$ 270,00/ano'}
                      {selectedPlan === 'socialmidia' && 'R$ 495,00/ano'}
                      {selectedPlan === 'fullservice' && 'R$ 972,00/ano'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setChangePlanOpen(false);
                  setSelectedPlan('');
                  setSelectedCycle('monthly');
                }}
                disabled={changingPlan}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedPlan) {
                    toast.error('Selecione um plano');
                    return;
                  }

                  setChangingPlan(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('admin-change-plan', {
                      body: {
                        agency_id: agency.id,
                        new_plan: selectedPlan,
                        billing_cycle: ['eugencia', 'socialmidia', 'fullservice'].includes(selectedPlan) 
                          ? selectedCycle 
                          : null,
                      },
                    });

                    if (error) throw error;

                    if (data.payment_url) {
                      toast.success('Plano alterado! Aguardando pagamento...', {
                        description: 'Um link de pagamento foi gerado.',
                      });
                      window.open(data.payment_url, '_blank');
                    } else {
                      toast.success(data.message || 'Plano alterado com sucesso');
                    }

                    setChangePlanOpen(false);
                    setSelectedPlan('');
                    setSelectedCycle('monthly');
                    loadData();
                  } catch (error: any) {
                    console.error('Erro ao alterar plano:', error);
                    toast.error(error.message || 'Erro ao alterar plano');
                  } finally {
                    setChangingPlan(false);
                  }
                }}
                disabled={changingPlan || !selectedPlan}
                className="flex-1"
              >
                {changingPlan ? 'Processando...' : 'Confirmar Alteração'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Redefinir senha do administrador da agência {agency.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação irá enviar um e-mail de redefinição de senha para o administrador da agência.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  const { data: adminEmail } = await supabase
                    .rpc('get_agency_admin_email', { agency_id_param: agency.id });
                  
                  if (!adminEmail) {
                    toast.error('Email do administrador não encontrado');
                    return;
                  }
                  
                  const { error } = await supabase.auth.resetPasswordForEmail(adminEmail, {
                    redirectTo: `${window.location.origin}/auth/reset-password`,
                  });
                  
                  if (error) throw error;
                  
                  toast.success('E-mail de redefinição enviado com sucesso');
                  setChangePasswordOpen(false);
                } catch (error) {
                  console.error('Erro ao enviar e-mail:', error);
                  toast.error('Erro ao enviar e-mail de redefinição');
                }
              }}
            >
              Enviar E-mail de Redefinição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgenciaDetalhes;
