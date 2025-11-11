import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SystemSettingsManager } from "@/components/admin/SystemSettingsManager";
import { PlanEntitlementsEditor } from "@/components/admin/PlanEntitlementsEditor";
import { RolesManager } from "@/components/admin/RolesManager";
import { TestRunner } from "@/components/admin/TestRunner";
import { GenerateThumbnailsButton } from "@/components/admin/GenerateThumbnailsButton";
import { OrphanedAccountsManager } from "@/components/admin/OrphanedAccountsManager";
import { PixelIntegrationManager } from "@/components/admin/PixelIntegrationManager";
import { NotificationSender } from "@/components/admin/NotificationSender";
import { 
  ArrowLeft, Settings, Shield, Database, TestTube, Image, Users, 
  Webhook, Building2, DollarSign, Bell, TrendingUp, CreditCard, 
  TicketCheck, FileText, UserCog, Loader2, RefreshCw 
} from "lucide-react";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        setProfile({ ...profileData, role: roleData || 'client_user' });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Apenas super admins podem acessar esta página
  if (profile?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Você não tem permissão para acessar esta página.</p>
              <Button onClick={() => navigate("/dashboard")} className="mt-4">
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações do Sistema
            </h1>
            <p className="text-muted-foreground">
              Gerencie configurações avançadas da plataforma
            </p>
          </div>

          <Accordion type="multiple" className="space-y-4">
            {/* 1. Gerenciamento de Usuários */}
            <AccordionItem value="users-management" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <CardTitle>Gerenciamento de Usuários</CardTitle>
                        <CardDescription className="mt-1">
                          Gerencie usuários, roles e auditoria
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-2">
                    <Button onClick={() => navigate("/admin/usuarios")} variant="outline" className="w-full justify-start">
                      <UserCog className="h-4 w-4 mr-2" />
                      Gerenciar Usuários
                    </Button>
                    <Button onClick={() => navigate("/admin/auditoria-usuarios")} variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Log de Auditoria
                    </Button>
                    <Separator className="my-2" />
                    <div className="text-sm font-medium mb-2">Contas Órfãs</div>
                    <OrphanedAccountsManager />
                    <Separator className="my-2" />
                    <div className="text-sm font-medium mb-2">Gerenciamento de Roles</div>
                    <RolesManager />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 2. Stripe & Pagamentos */}
            <AccordionItem value="stripe-payments" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-500" />
                      <div className="text-left">
                        <CardTitle>Stripe & Pagamentos</CardTitle>
                        <CardDescription className="mt-1">
                          Configure produtos, diagnóstico e sincronização
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-2">
                    <Button onClick={() => navigate("/admin/stripe")} variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Configuração Stripe
                    </Button>
                    <Button onClick={() => navigate("/admin/stripe-diagnostic")} variant="outline" className="w-full justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Diagnóstico Stripe
                    </Button>
                    <Button onClick={() => navigate("/admin/stripe-sync")} variant="outline" className="w-full justify-start">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronização Stripe
                    </Button>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 3. Suporte & Tickets */}
            <AccordionItem value="support-tickets" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <TicketCheck className="h-5 w-5 text-yellow-500" />
                      <div className="text-left">
                        <CardTitle>Suporte & Tickets</CardTitle>
                        <CardDescription className="mt-1">
                          Gerencie tickets de suporte do sistema
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-2">
                    <Button onClick={() => navigate("/admin/tickets")} variant="outline" className="w-full justify-start">
                      <TicketCheck className="h-4 w-4 mr-2" />
                      Tickets Admin
                    </Button>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 4. Segurança & Webhooks */}
            <AccordionItem value="security-webhooks" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      <div className="text-left">
                        <CardTitle>Segurança & Webhooks</CardTitle>
                        <CardDescription className="mt-1">
                          Gerencie IPs bloqueados e webhooks de notificações
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-2">
                    <Button onClick={() => navigate("/admin/blocked-ips")} variant="outline" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Gerenciar IPs Bloqueados
                    </Button>
                    <Separator className="my-2" />
                    <div className="text-sm font-medium mb-2">Configuração de Webhooks</div>
                    <SystemSettingsManager />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 5. Sistema & Recursos */}
            <AccordionItem value="system-resources" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-purple-500" />
                      <div className="text-left">
                        <CardTitle>Sistema & Recursos</CardTitle>
                        <CardDescription className="mt-1">
                          Configure planos, pixels, mídia e testes
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Planos de Assinatura</div>
                      <PlanEntitlementsEditor />
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">Pixels de Rastreamento Global</div>
                      <PixelIntegrationManager />
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">Ferramentas de Mídia</div>
                      <GenerateThumbnailsButton />
                    </div>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium mb-2">Testes do Sistema</div>
                      <TestRunner />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 6. Notificações */}
            <AccordionItem value="notifications" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-pink-500" />
                      <div className="text-left">
                        <CardTitle>Notificações</CardTitle>
                        <CardDescription className="mt-1">
                          Enviar notificações para usuários da plataforma
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <NotificationSender />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Configuracoes;
