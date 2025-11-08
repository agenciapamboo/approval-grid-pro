import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, MessageCircle, Edit, Building2, Calendar, Globe, MapPin } from "lucide-react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ClienteDetalhes = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);

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

      // Carregar conteúdos do cliente
      const { data: contentsData } = await supabase
        .from("contents")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(10);

      if (contentsData) setContents(contentsData);
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
                {client.email && (
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                )}
                {client.whatsapp && (
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
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
            <TabsTrigger value="uso">Histórico de Uso</TabsTrigger>
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
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
              <CardContent className="space-y-2">
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

          {/* Tab: Dados Cadastrais */}
          <TabsContent value="cadastral">
            <Card>
              <CardHeader>
                <CardTitle>Dados Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {client.cnpj && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                      <p className="text-base">{client.cnpj}</p>
                    </div>
                  )}
                  {client.website && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Website</label>
                      <p className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {client.website}
                        </a>
                      </p>
                    </div>
                  )}
                  {client.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base">{client.email}</p>
                    </div>
                  )}
                  {client.whatsapp && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                      <p className="text-base">{client.whatsapp}</p>
                    </div>
                  )}
                  {client.address && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <p className="text-base flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        {client.address}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Histórico de Uso */}
          <TabsContent value="uso">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdos Recentes</CardTitle>
                <CardDescription>Últimos 10 conteúdos criados</CardDescription>
              </CardHeader>
              <CardContent>
                {contents.length > 0 ? (
                  <div className="space-y-2">
                    {contents.map((content) => (
                      <div key={content.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{content.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge>{content.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum conteúdo encontrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Recursos */}
          <TabsContent value="recursos">
            <Card>
              <CardHeader>
                <CardTitle>Recursos e Limites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Informações de recursos disponíveis em breve</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
};

export default ClienteDetalhes;
