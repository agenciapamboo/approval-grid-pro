import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ApproversManager } from "@/components/admin/ApproversManager";
import { SocialAccountsDialog } from "@/components/admin/SocialAccountsDialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Building2, Edit, Calendar, FileText, Users, Shield,
  Loader2, Globe, MapPin, Share2, Eye, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ClienteDetalhes = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [monthlyCreatives, setMonthlyCreatives] = useState({ used: 0, limit: 0, percentage: 0 });
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cnpj: "",
    whatsapp: "",
    website: "",
    monthly_creatives: 0,
    plan_renewal_date: "",
    address: "",
    new_password: "",
    new_note: "",
    notify_email: true,
    notify_whatsapp: false,
    notify_webhook: true,
  });

  useEffect(() => {
    checkAuth();
  }, [clientId]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        setProfile({ ...profileData, role: roleData || 'client_user' });
        await loadClient();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClient = async () => {
    if (!clientId) return;

    const { data: clientData } = await supabase
      .from("clients")
      .select("*, agencies(name, slug)")
      .eq("id", clientId)
      .single();

    if (clientData) {
      setClient(clientData);
      
      // Populate form data
      setFormData({
        name: clientData.name || "",
        email: clientData.email || "",
        cnpj: clientData.cnpj || "",
        whatsapp: clientData.whatsapp || "",
        website: clientData.website || "",
        monthly_creatives: clientData.monthly_creatives || 0,
        plan_renewal_date: clientData.plan_renewal_date ? clientData.plan_renewal_date.split('T')[0] : "",
        address: clientData.address || "",
        new_password: "",
        new_note: "",
        notify_email: clientData.notify_email ?? true,
        notify_whatsapp: clientData.notify_whatsapp ?? false,
        notify_webhook: clientData.notify_webhook ?? true,
      });

      // Carregar conteúdos do cliente
      const { data: contentsData } = await supabase
        .from("contents")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(10);

      if (contentsData) setContents(contentsData);

      // Calcular criativos do mês
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { count: creativesUsed } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('created_at', startOfMonth.toISOString());

      const percentage = clientData.monthly_creatives > 0 
        ? ((creativesUsed || 0) / clientData.monthly_creatives) * 100 
        : 0;

      setMonthlyCreatives({
        used: creativesUsed || 0,
        limit: clientData.monthly_creatives || 0,
        percentage
      });
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Atualizar dados do cliente
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          email: formData.email,
          cnpj: formData.cnpj,
          whatsapp: formData.whatsapp,
          website: formData.website,
          monthly_creatives: formData.monthly_creatives,
          plan_renewal_date: formData.plan_renewal_date || null,
          address: formData.address,
          notify_email: formData.notify_email,
          notify_whatsapp: formData.notify_whatsapp,
          notify_webhook: formData.notify_webhook,
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Se tiver nova senha, atualizar
      if (formData.new_password) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('client_id', clientId)
          .limit(1);

        if (profiles && profiles[0]) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            profiles[0].id,
            { password: formData.new_password }
          );
          if (passwordError) throw passwordError;
        }
      }

      // Se tiver nova observação, adicionar nota
      if (formData.new_note) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('client_notes')
          .insert({
            client_id: clientId,
            note: formData.new_note,
            created_by: user?.id
          });
        
        setFormData(prev => ({ ...prev, new_note: "" }));
      }

      toast({
        title: "Sucesso",
        description: "Dados do cliente atualizados com sucesso",
      });

      await loadClient();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do cliente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Cliente não encontrado</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/clientes")}>
                Voltar para Clientes
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  const contentStats = {
    draft: contents.filter(c => c.status === 'draft').length,
    in_review: contents.filter(c => c.status === 'in_review').length,
    approved: contents.filter(c => c.status === 'approved').length,
    published: contents.filter(c => c.status === 'published').length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Clientes
          </Button>
        </div>

        {/* Header do Cliente */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="h-16 w-16 object-contain rounded" />
                ) : (
                  <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl">{client.name}</CardTitle>
                  <p className="text-sm text-muted-foreground font-mono">{client.slug}</p>
                  {client.agencies && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Agência: {client.agencies.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSocialDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Redes Sociais
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/agency/client/${clientId}`)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Conteúdos
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/agency/client/${clientId}`)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar Criativos
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs de Informações */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="cadastral">Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="aprovadores">Aprovadores</TabsTrigger>
            <TabsTrigger value="solicitacoes">Histórico de Solicitações</TabsTrigger>
            <TabsTrigger value="aprovacoes">Histórico de Aprovação</TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{contentStats.draft}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Em Revisão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{contentStats.in_review}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{contentStats.approved}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Publicados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{contentStats.published}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Criativos do Mês</span>
                    <span className="text-sm font-medium">{monthlyCreatives.used} / {monthlyCreatives.limit}</span>
                  </div>
                  <Progress value={monthlyCreatives.percentage} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyCreatives.percentage.toFixed(1)}% da cota utilizada
                  </p>
                </div>
                <Separator />
                {client.plan_renewal_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Renovação: {format(new Date(client.plan_renewal_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Dados Cadastrais - EDITÁVEL */}
          <TabsContent value="cadastral">
            <Card>
              <CardHeader>
                <CardTitle>Dados Cadastrais</CardTitle>
                <CardDescription>Edite os dados do cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateClient} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required 
                      />
                    </div>
                    <div>
                      <Label>Email (Login 2FA) *</Label>
                      <Input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Alterar este email altera o login do cliente
                      </p>
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input 
                        value={formData.cnpj} 
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>WhatsApp (Login 2FA)</Label>
                      <Input 
                        value={formData.whatsapp} 
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Nova Senha</Label>
                      <Input 
                        type="password" 
                        placeholder="Deixe em branco para manter"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Vencimento (Contrato)</Label>
                      <Input 
                        type="date" 
                        value={formData.plan_renewal_date}
                        onChange={(e) => setFormData({ ...formData, plan_renewal_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas para controle interno da agência
                      </p>
                    </div>
                    <div>
                      <Label>Site</Label>
                      <Input 
                        type="url" 
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Criativos por Mês</Label>
                      <Input 
                        type="number" 
                        value={formData.monthly_creatives}
                        onChange={(e) => setFormData({ ...formData, monthly_creatives: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Endereço Completo</Label>
                    <Textarea
                      placeholder="Rua, Número, Complemento - Bairro, Cidade - Estado, CEP"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Nova Observação</Label>
                    <Textarea 
                      placeholder="Adicione uma nota sobre o cliente..."
                      value={formData.new_note}
                      onChange={(e) => setFormData({ ...formData, new_note: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Preferências de Notificação</h4>
                    <div className="flex items-center justify-between">
                      <Label>Notificações por Email</Label>
                      <Switch 
                        checked={formData.notify_email}
                        onCheckedChange={(checked) => setFormData({ ...formData, notify_email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Notificações por WhatsApp</Label>
                      <Switch 
                        checked={formData.notify_whatsapp}
                        onCheckedChange={(checked) => setFormData({ ...formData, notify_whatsapp: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Webhook</Label>
                      <Badge>Sempre Ativo</Badge>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => loadClient()}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Aprovadores */}
          <TabsContent value="aprovadores">
            <ApproversManager clientId={clientId || ""} clientName={client.name} />
          </TabsContent>

          {/* Tab: Histórico de Solicitações */}
          <TabsContent value="solicitacoes">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Solicitações</CardTitle>
                <CardDescription>Todas as solicitações de criação de conteúdo deste cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-muted-foreground">Acesse a página de solicitações para ver todos os pedidos</p>
                  <Button onClick={() => navigate(`/agency/creative-requests/${clientId}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Solicitações Criativas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Histórico de Aprovação */}
          <TabsContent value="aprovacoes">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Aprovação</CardTitle>
                <CardDescription>Histórico completo de aprovações, comentários e ajustes solicitados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-muted-foreground">Acesse o histórico completo de aprovações deste cliente</p>
                  <Button onClick={() => navigate(`/client/${clientId}/history`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Histórico de Aprovação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <SocialAccountsDialog 
        clientId={clientId || ""}
        open={socialDialogOpen}
        onOpenChange={setSocialDialogOpen}
      />

      <AppFooter />
    </div>
  );
};

export default ClienteDetalhes;
