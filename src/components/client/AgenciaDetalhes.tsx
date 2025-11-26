import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  if (!agency) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Agência não encontrada</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/agencias")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Agências
          </Button>

          <Card>
            <CardHeader className="pb-4 md:pb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 md:gap-4">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={agency.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-xl md:text-2xl truncate">{agency.name}</CardTitle>
                    <CardDescription className="text-sm md:text-base">@{agency.slug}</CardDescription>
                    <Badge variant="default" className="mt-2 text-xs md:text-sm">
                      {getPlanDisplayName(agency.plan)}
                      {agency.plan_type && ` (${agency.plan_type === 'monthly' ? 'Mensal' : 'Anual'})`}
                    </Badge>
                  </div>
                </div>
                
                {/* Botões - empilhados em mobile */}
                <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => setChangePlanOpen(true)}
                    className="w-full md:w-auto justify-start md:justify-center"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Alterar Plano
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setChangePasswordOpen(true)}
                    className="w-full md:w-auto justify-start md:justify-center"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditDialogOpen(true)}
                    className="w-full md:w-auto justify-start md:justify-center"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="w-full md:w-auto justify-start md:justify-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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

          <Card className="mt-4 md:mt-6">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                Clientes ({clients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clients.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="min-w-full inline-block align-middle px-4 md:px-0">
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
                      {clients.map((client) => (
                        <Card 
                          key={client.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/cliente/${client.id}`)}
                        >
                          <CardContent className="p-4 md:pt-6">
                            <div className="flex items-center gap-3">
                              {client.logo_url ? (
                                <img
                                  src={client.logo_url}
                                  alt={client.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 text-secondary-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm md:text-base truncate">{client.name}</p>
                                <p className="text-xs text-muted-foreground truncate">@{client.slug}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm md:text-base text-muted-foreground text-center py-4">
                  Nenhum cliente cadastrado para esta agência
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
    </AppLayout>
  );
};

export default AgenciaDetalhes;
