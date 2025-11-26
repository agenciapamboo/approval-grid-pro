import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIConfiguration } from "@/components/admin/AIConfiguration";
import { AICostDashboard } from "@/components/admin/AICostDashboard";
import { Sparkles, Database, TrendingUp, AlertCircle } from "lucide-react";
import AccessGate from "@/components/auth/AccessGate";
import { supabase } from "@/integrations/supabase/client";

export default function AISettings() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('get_user_role', { _user_id: user.id });
          setRole(data);
        }
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Configurações de IA</h1>
              <p className="text-muted-foreground">
                Configure OpenAI, limites por plano e monitore custos
              </p>
            </div>
          </div>

          {/* Alerta para Agency Admin */}
          {!loading && role === 'agency_admin' && (
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>Modo Visualização:</strong> Você pode visualizar as configurações de IA, mas apenas Super Admins podem editá-las. 
                Configurações globais afetam toda a plataforma.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">
                <Sparkles className="h-4 w-4 mr-2" />
                Configuração
              </TabsTrigger>
              <TabsTrigger value="limits">
                <Database className="h-4 w-4 mr-2" />
                Limites por Plano
              </TabsTrigger>
              <TabsTrigger value="costs">
                <TrendingUp className="h-4 w-4 mr-2" />
                Uso e Custos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-6">
              <AIConfiguration />
            </TabsContent>

            <TabsContent value="limits" className="mt-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Limites por Plano</CardTitle>
                  <CardDescription>
                    Configure quantos usos de IA cada plano tem por mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { plan: 'Creator', limit: 10, color: 'bg-blue-500' },
                      { plan: 'Eugência', limit: 100, color: 'bg-green-500' },
                      { plan: 'Agência Social', limit: 300, color: 'bg-purple-500' },
                      { plan: 'Full Service', limit: 500, color: 'bg-orange-500' },
                      { plan: 'Unlimited', limit: null, color: 'bg-primary' },
                    ].map((item) => (
                      <div
                        key={item.plan}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${item.color}`} />
                          <span className="font-medium">{item.plan}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.limit === null ? (
                            <span className="text-primary font-semibold">Ilimitado</span>
                          ) : (
                            <span>{item.limit} usos/mês</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    💡 Respostas do cache não contam para o limite
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costs" className="mt-6">
              <AICostDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </AccessGate>
  );
}
