import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIConfiguration } from "@/components/admin/AIConfiguration";
import { AICostDashboard } from "@/components/admin/AICostDashboard";
import { Sparkles, Database, TrendingUp } from "lucide-react";
import AccessGate from "@/components/auth/AccessGate";

export default function AISettings() {
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
