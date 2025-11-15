import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { BlockedIPsManager } from "@/components/admin/BlockedIPsManager";
import { TrustedIPsManager } from "@/components/admin/TrustedIPsManager";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccessGate from "@/components/auth/AccessGate";

const SecurityDashboard = () => {
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
        const userProfile = { ...profileData, role: roleData || 'client_user' };
        
        // Verificar se é super admin ou agency admin
        if (roleData !== 'super_admin' && roleData !== 'agency_admin') {
          navigate("/dashboard");
          return;
        }

        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      navigate("/auth");
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader 
        userName={profile?.name} 
        userRole={profile?.role} 
        onSignOut={() => navigate("/auth")} 
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard de Segurança</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie bloqueios de IP e whitelist de endereços confiáveis
          </p>
        </div>

        <Tabs defaultValue="blocked" className="space-y-6">
          <TabsList>
            <TabsTrigger value="blocked">IPs Bloqueados</TabsTrigger>
            <TabsTrigger value="trusted">IPs Confiáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="blocked">
            <Card>
              <CardHeader>
                <CardTitle>IPs Bloqueados por Tentativas de Login</CardTitle>
                <CardDescription>
                  Visualize e desbloqueie endereços IP que foram bloqueados automaticamente por excesso de tentativas de login
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BlockedIPsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trusted">
            <Card>
              <CardHeader>
                <CardTitle>Whitelist de IPs Confiáveis</CardTitle>
                <CardDescription>
                  Gerencie IPs que nunca serão bloqueados pelo sistema de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrustedIPsManager 
                  trustedIPs={[]} 
                  onRefresh={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
};

export default SecurityDashboard;
