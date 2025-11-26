import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, AlertTriangle, ArrowLeft, User, Shield, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { PlanInfoCard } from "@/components/client/PlanInfoCard";

const MyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [agencyDetails, setAgencyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedWhatsapp, setEditedWhatsapp] = useState("");
  const [client, setClient] = useState<any>(null);
  const [clientData, setClientData] = useState({
    name: "",
    cnpj: "",
    address: "",
    monthly_creatives: 0,
    notify_email: true,
    notify_whatsapp: false,
  });
  const [agency, setAgency] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { status: subscriptionStatus, loading: statusLoading } = useSubscriptionStatus();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      setUserRole(roleData);

      if (profileData) {
        const enrichedProfile = { ...profileData, role: roleData || 'client_user' };
        setProfile(enrichedProfile);
        setEditedName(profileData.name || "");
        setEditedWhatsapp(profileData.whatsapp || "");
        
        // Se é client_user, carregar dados do cliente e agência
        if (roleData === 'client_user' && profileData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", profileData.client_id)
            .single();
          
          if (clientData) {
            setClient(clientData);
            setClientData({
              name: clientData.name || "",
              cnpj: clientData.cnpj || "",
              address: clientData.address || "",
              monthly_creatives: clientData.monthly_creatives || 0,
              notify_email: clientData.notify_email ?? true,
              notify_whatsapp: clientData.notify_whatsapp ?? false,
            });
            
            const { data: agencyData } = await supabase
              .from("agencies")
              .select("id, name, slug")
              .eq("id", clientData.agency_id)
              .single();
            
            if (agencyData) {
              setAgency(agencyData);
            }
          }
        }

        // Se for agency_admin, buscar dados da agência
        if (roleData === 'agency_admin' && profileData.agency_id) {
          const { data: agencyData } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', profileData.agency_id)
            .single();

          if (agencyData) {
            setAgencyDetails(agencyData);
            console.log('[MyAccount] Agency details loaded:', agencyData);
          }
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editedName,
          whatsapp: editedWhatsapp,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

      await checkAuth();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar a senha.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível abrir o portal de pagamento.",
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const handleSaveClientData = async () => {
    if (!client?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: clientData.name,
          cnpj: clientData.cnpj,
          address: clientData.address,
          notify_email: clientData.notify_email,
          notify_whatsapp: clientData.notify_whatsapp,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Dados atualizados",
        description: "Suas informações cadastrais foram salvas com sucesso.",
      });

      await checkAuth();
    } catch (error) {
      console.error("Error updating client data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar os dados cadastrais.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

  const getPlanName = (plan: string) => {
    const planMap: Record<string, string> = {
      creator: "Creator (Gratuito)",
      eugencia: "Eugência",
      socialMidia: "Social Mídia",
      fullService: "Full Service",
    };
    return planMap[plan] || plan;
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    if (subscriptionStatus.isBlocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }

    if (subscriptionStatus.subscriptionStatus === 'active') {
      return <Badge variant="default">Ativo</Badge>;
    }

    if (subscriptionStatus.subscriptionStatus === 'trialing') {
      return <Badge variant="outline">Período de teste</Badge>;
    }

    if (subscriptionStatus.delinquent) {
      return <Badge variant="destructive">Pagamento pendente</Badge>;
    }

    return <Badge variant="outline">Inativo</Badge>;
  };

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  const isClientUser = profile?.role === 'client_user';

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Gerencie suas informações pessoais e configurações de segurança" : "Gerencie seu plano, assinatura e informações pessoais"}
            </p>
          </div>

          <Tabs defaultValue={isClientUser ? "profile" : (isSuperAdmin ? "profile" : "subscription")} className="space-y-6">
            <TabsList className="grid w-full" style={{ 
              gridTemplateColumns: userRole === 'agency_admin' ? '1fr 1fr 1fr 1fr' : ((isSuperAdmin || isClientUser) ? "1fr 1fr" : "1fr 1fr 1fr")
            }}>
              {!isSuperAdmin && !isClientUser && (
                <TabsTrigger value="subscription">Minha Assinatura</TabsTrigger>
              )}
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </TabsTrigger>
              {userRole === 'agency_admin' && (
                <TabsTrigger value="agency">Dados da Agência</TabsTrigger>
              )}
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Segurança
              </TabsTrigger>
            </TabsList>

            {!isSuperAdmin && !isClientUser && subscriptionStatus && (
              <TabsContent value="subscription" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Status da Assinatura</CardTitle>
                    <CardDescription>
                      Gerencie seu plano e pagamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Plano Atual</p>
                        <p className="text-2xl font-bold">
                          {getPlanName(subscriptionStatus.plan || 'creator')}
                        </p>
                      </div>
                      <div>
                        {getStatusBadge()}
                      </div>
                    </div>

                    {subscriptionStatus.isInGracePeriod && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Período de Carência</AlertTitle>
                        <AlertDescription>
                          Seu pagamento está atrasado. Você tem até{' '}
                          {subscriptionStatus.gracePeriodEnd
                            ? new Date(subscriptionStatus.gracePeriodEnd).toLocaleDateString('pt-BR')
                            : 'data não disponível'}{' '}
                          para regularizar seu pagamento antes que sua conta seja bloqueada.
                        </AlertDescription>
                      </Alert>
                    )}

                    {subscriptionStatus.isBlocked && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Conta Bloqueada</AlertTitle>
                        <AlertDescription>
                          {subscriptionStatus.blockReason === 'grace_period_expired'
                            ? 'O período de carência expirou. Por favor, regularize seu pagamento para continuar usando a plataforma.'
                            : 'Sua conta está bloqueada. Entre em contato com o suporte.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Posts</p>
                        <p className="text-lg font-semibold">
                          {subscriptionStatus.entitlements.posts_limit === null
                            ? 'Ilimitado'
                            : subscriptionStatus.entitlements.posts_limit || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Criativos</p>
                        <p className="text-lg font-semibold">
                          {subscriptionStatus.entitlements.creatives_limit === null
                            ? 'Ilimitado'
                            : subscriptionStatus.entitlements.creatives_limit || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Membros da Equipe</p>
                        <p className="text-lg font-semibold">
                          {subscriptionStatus.entitlements.team_members_limit === null
                            ? 'Ilimitado'
                            : subscriptionStatus.entitlements.team_members_limit || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Histórico</p>
                        <p className="text-lg font-semibold">
                          {subscriptionStatus.entitlements.history_days || 0} dias
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recursos Disponíveis</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.whatsapp_support ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Suporte WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.graphics_approval ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Aprovação de Artes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.supplier_link ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Link de Fornecedor</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.global_agenda ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Agenda Global</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.team_kanban ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Kanban de Equipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subscriptionStatus.entitlements.team_notifications ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">Notificações de Equipe</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {subscriptionStatus.plan !== 'pro' && (
                        <Button onClick={handleUpgradePlan} className="flex-1">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Fazer Upgrade
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleManageBilling}
                        disabled={managingBilling}
                        className="flex-1"
                      >
                        {managingBilling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Abrindo...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Gerenciar Pagamento
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    {isClientUser 
                      ? "Complete suas informações de perfil" 
                      : "Atualize suas informações de perfil"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      value={editedWhatsapp}
                      onChange={(e) => setEditedWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                    {isClientUser && (
                      <p className="text-xs text-muted-foreground">
                        Seu WhatsApp será usado para comunicação sobre aprovações de conteúdo
                      </p>
                    )}
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {isClientUser && client && (
                <>
                  <PlanInfoCard clientId={client.id} />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados Cadastrais</CardTitle>
                      <CardDescription>Gerencie as informações da sua empresa</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="client-name">Nome/Razão Social</Label>
                        <Input
                          id="client-name"
                          value={clientData.name}
                          onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                          placeholder="Nome da empresa"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CPF/CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={clientData.cnpj}
                          onChange={(e) => setClientData({ ...clientData, cnpj: e.target.value })}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Textarea
                          id="address"
                          value={clientData.address}
                          onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                          placeholder="Rua, número, bairro, cidade - Estado"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="monthly-creatives">Criativos Mensais</Label>
                        <Input
                          id="monthly-creatives"
                          type="number"
                          value={clientData.monthly_creatives}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Configurado pela agência
                        </p>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        <Label>Preferências de Notificação</Label>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="client-notify-email" className="flex flex-col gap-1 cursor-pointer">
                            <span>Notificações por E-mail</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              Receber atualizações de aprovações e conteúdos por email
                            </span>
                          </Label>
                          <Switch
                            id="client-notify-email"
                            checked={clientData.notify_email}
                            onCheckedChange={(checked) => setClientData({ ...clientData, notify_email: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="client-notify-whatsapp" className="flex flex-col gap-1 cursor-pointer">
                            <span>Notificações por WhatsApp</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              Receber atualizações de aprovações e conteúdos por WhatsApp
                            </span>
                          </Label>
                          <Switch
                            id="client-notify-whatsapp"
                            checked={clientData.notify_whatsapp}
                            onCheckedChange={(checked) => setClientData({ ...clientData, notify_whatsapp: checked })}
                          />
                        </div>
                      </div>

                      <Button onClick={handleSaveClientData} disabled={saving} className="w-full">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar Dados Cadastrais"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações da Empresa</CardTitle>
                      <CardDescription>Dados do seu cliente gerenciado pela agência</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Cliente</p>
                        <p className="text-sm text-muted-foreground">{client.name}</p>
                      </div>
                      {agency && (
                        <div>
                          <p className="text-sm font-medium">Agência Responsável</p>
                          <p className="text-sm text-muted-foreground">{agency.name}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Agency Data Tab - Only for agency_admin */}
            {userRole === 'agency_admin' && agencyDetails && (
              <TabsContent value="agency" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Cadastrais</CardTitle>
                    <CardDescription>
                      Dados da sua agência. Para editar, acesse a página de gerenciamento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Agência</Label>
                        <Input value={agencyDetails.name || ''} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label>Slug (URL)</Label>
                        <Input value={agencyDetails.slug || ''} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input value={agencyDetails.email || 'Não informado'} disabled className="mt-1" />
                      </div>
                      <div>
                        <Label>WhatsApp</Label>
                        <Input value={agencyDetails.whatsapp || 'Não informado'} disabled className="mt-1" />
                      </div>
                    </div>
                    {agencyDetails.logo_url && (
                      <div>
                        <Label>Logo</Label>
                        <div className="mt-2">
                          <img 
                            src={agencyDetails.logo_url} 
                            alt="Logo da agência" 
                            className="h-16 w-auto object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dados Fiscais e Plano</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Plano Atual</Label>
                        <div className="mt-1">
                          <Badge variant="outline">
                            {agencyDetails.plan || 'Não definido'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label>Tipo de Plano</Label>
                        <Input 
                          value={agencyDetails.plan_type === 'monthly' ? 'Mensal' : agencyDetails.plan_type === 'annual' ? 'Anual' : 'Não definido'} 
                          disabled 
                          className="mt-1" 
                        />
                      </div>
                      {agencyDetails.plan_renewal_date && (
                        <div>
                          <Label>Data de Renovação</Label>
                          <Input 
                            value={new Date(agencyDetails.plan_renewal_date).toLocaleDateString('pt-BR')} 
                            disabled 
                            className="mt-1" 
                          />
                        </div>
                      )}
                      {agencyDetails.last_payment_date && (
                        <div>
                          <Label>Último Pagamento</Label>
                          <Input 
                            value={new Date(agencyDetails.last_payment_date).toLocaleDateString('pt-BR')} 
                            disabled 
                            className="mt-1" 
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Branding e Integração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agencyDetails.brand_primary && (
                        <div>
                          <Label>Cor Primária</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="w-10 h-10 rounded border" 
                              style={{ backgroundColor: agencyDetails.brand_primary }}
                            />
                            <Input value={agencyDetails.brand_primary} disabled />
                          </div>
                        </div>
                      )}
                      {agencyDetails.brand_secondary && (
                        <div>
                          <Label>Cor Secundária</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="w-10 h-10 rounded border" 
                              style={{ backgroundColor: agencyDetails.brand_secondary }}
                            />
                            <Input value={agencyDetails.brand_secondary} disabled />
                          </div>
                        </div>
                      )}
                      {agencyDetails.webhook_url && (
                        <div className="md:col-span-2">
                          <Label>Webhook URL</Label>
                          <Input 
                            type="password" 
                            value={agencyDetails.webhook_url} 
                            disabled 
                            className="mt-1" 
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Atualize sua senha para manter sua conta segura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                    />
                  </div>

                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changingPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default MyAccount;
