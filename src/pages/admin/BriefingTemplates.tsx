import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import AccessGate from "@/components/auth/AccessGate";

export default function BriefingTemplates() {
  return (
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Templates de Briefing</h1>
              <p className="text-muted-foreground">
                Crie e gerencie formulários personalizados de briefing
              </p>
            </div>
          </div>

          {/* Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Em Desenvolvimento</CardTitle>
              <CardDescription>
                Os templates de briefing estão sendo implementados. 
                Por enquanto, utilize a funcionalidade de briefing padrão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta página permitirá criar formulários personalizados para coleta de informações dos clientes.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AccessGate>
  );
}
