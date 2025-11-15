import { AppLayout } from "@/components/layout/AppLayout";
import { BlockedIPsManager } from "@/components/admin/BlockedIPsManager";
import { TrustedIPsManager } from "@/components/admin/TrustedIPsManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccessGate from "@/components/auth/AccessGate";

const SecurityDashboard = () => {
  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
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
        </div>
      </AppLayout>
    </AccessGate>
  );
};

export default SecurityDashboard;
