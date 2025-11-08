import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LovablePlanConfig } from "@/components/admin/LovablePlanConfig";
import { SystemSettingsManager } from "@/components/admin/SystemSettingsManager";
import { PlanEntitlementsEditor } from "@/components/admin/PlanEntitlementsEditor";
import { RolesManager } from "@/components/admin/RolesManager";
import { TestRunner } from "@/components/admin/TestRunner";
import { TestNotificationButton } from "@/components/admin/TestNotificationButton";
import { GenerateThumbnailsButton } from "@/components/admin/GenerateThumbnailsButton";
import { OrphanedAccountsManager } from "@/components/admin/OrphanedAccountsManager";
import { ArrowLeft, Settings, Shield, Database, Bell, TestTube, Image, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadNotificationStats();
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

  const loadNotificationStats = async () => {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("status")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        const stats = {
          pending: data.filter(n => n.status === 'pending').length,
          sent: data.filter(n => n.status === 'sent').length,
          failed: data.filter(n => n.status === 'failed').length,
        };
        setNotificationStats(stats);
      }
    } catch (error) {
      console.error("Error loading notification stats:", error);
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

          {/* 1. Plano Lovable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Plano Lovable
              </CardTitle>
              <CardDescription>
                Configure limites de recursos e custos de overage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LovablePlanConfig />
            </CardContent>
          </Card>

          <Separator />

          {/* 2. Editor de Planos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Planos de Assinatura
              </CardTitle>
              <CardDescription>
                Configure limites e recursos de cada plano (Creator, Eugência, Social Mídia, Full Service, Unlimited)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanEntitlementsEditor />
            </CardContent>
          </Card>

          <Separator />

          {/* 3. Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Configure URLs de webhooks para notificações externas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemSettingsManager />
            </CardContent>
          </Card>

          <Separator />

          {/* 4. Gerenciamento de Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciamento de Roles
              </CardTitle>
              <CardDescription>
                Configure permissões por role e altere roles de usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesManager />
            </CardContent>
          </Card>

          <Separator />

          {/* 5. Notificações Automáticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações Automáticas
              </CardTitle>
              <CardDescription>
                Status das notificações automáticas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationStats ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{notificationStats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{notificationStats.sent}</p>
                    <p className="text-sm text-muted-foreground">Enviadas</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{notificationStats.failed}</p>
                    <p className="text-sm text-muted-foreground">Falhadas</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Carregando estatísticas...</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* 6. Testes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Testes do Sistema
              </CardTitle>
              <CardDescription>
                Execute testes automatizados e envie notificações de teste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TestRunner />
              <div className="pt-4 border-t">
                <TestNotificationButton />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 7. Ferramentas de Mídia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Ferramentas de Mídia
              </CardTitle>
              <CardDescription>
                Gere thumbnails e processe arquivos de mídia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateThumbnailsButton />
            </CardContent>
          </Card>

          <Separator />

          {/* 8. Contas Órfãs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contas Órfãs
              </CardTitle>
              <CardDescription>
                Gerencie contas sem agência ou cliente vinculado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrphanedAccountsManager />
            </CardContent>
          </Card>

          <Separator />

          {/* 9. IPs Bloqueados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Gerencie IPs bloqueados e configurações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/admin/blocked-ips")} variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Gerenciar IPs Bloqueados
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Configuracoes;
