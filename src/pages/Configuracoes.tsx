import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LovablePlanConfig } from "@/components/admin/LovablePlanConfig";
import { SystemSettingsManager } from "@/components/admin/SystemSettingsManager";
import { PlanEntitlementsEditor } from "@/components/admin/PlanEntitlementsEditor";
import { RolesManager } from "@/components/admin/RolesManager";
import { TestRunner } from "@/components/admin/TestRunner";
import { GenerateThumbnailsButton } from "@/components/admin/GenerateThumbnailsButton";
import { OrphanedAccountsManager } from "@/components/admin/OrphanedAccountsManager";
import { ArrowLeft, Settings, Shield, Database, TestTube, Image, Users, Webhook } from "lucide-react";
import { Loader2 } from "lucide-react";

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
              Gerencie configurações globais, planos, roles e recursos do sistema
            </p>
          </div>


          {/* Demais blocos em Accordion (começam colapsados) */}
          <Accordion type="multiple" className="space-y-4">
            {/* 2. Segurança */}
            <AccordionItem value="security" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Segurança</CardTitle>
                        <CardDescription className="mt-1">
                          Gerencie IPs bloqueados e configurações de segurança
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <Button onClick={() => navigate("/admin/blocked-ips")} variant="outline" className="w-full">
                      <Shield className="h-4 w-4 mr-2" />
                      Gerenciar IPs Bloqueados
                    </Button>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 3. Webhooks */}
            <AccordionItem value="webhooks" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Webhooks</CardTitle>
                        <CardDescription className="mt-1">
                          Configure URLs de webhooks para notificações externas
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <SystemSettingsManager />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 4. Plano Lovable */}
            <AccordionItem value="lovable-plan" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Plano Lovable</CardTitle>
                        <CardDescription className="mt-1">
                          Configure limites de recursos e custos de overage
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <LovablePlanConfig />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 5. Editor de Planos */}
            <AccordionItem value="subscription-plans" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Planos de Assinatura</CardTitle>
                        <CardDescription className="mt-1">
                          Configure limites e recursos de cada plano
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <PlanEntitlementsEditor />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 6. Roles */}
            <AccordionItem value="roles" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Gerenciamento de Roles</CardTitle>
                        <CardDescription className="mt-1">
                          Configure permissões por role e altere roles de usuários
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <RolesManager />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 7. Testes */}
            <AccordionItem value="tests" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Testes do Sistema</CardTitle>
                        <CardDescription className="mt-1">
                          Execute testes automatizados
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <TestRunner />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 8. Ferramentas de Mídia */}
            <AccordionItem value="media" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Ferramentas de Mídia</CardTitle>
                        <CardDescription className="mt-1">
                          Gere thumbnails e processe arquivos de mídia
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <GenerateThumbnailsButton />
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* 9. Contas Órfãs */}
            <AccordionItem value="orphaned" className="border rounded-lg">
              <Card className="border-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <CardHeader className="p-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <div className="text-left">
                        <CardTitle>Contas Órfãs</CardTitle>
                        <CardDescription className="mt-1">
                          Gerencie contas sem agência ou cliente vinculado
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <OrphanedAccountsManager />
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
