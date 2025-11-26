import { AppLayout } from "@/components/layout/AppLayout";
import AccessGate from "@/components/auth/AccessGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AgencySettings() {
  return (
    <AccessGate allow={['agency_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Configurações da Agência</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Gerencie as configurações da sua agência
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure as preferências da sua agência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configurações disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </AccessGate>
  );
}
