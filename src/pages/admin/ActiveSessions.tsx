import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import AccessGate from "@/components/auth/AccessGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Info } from "lucide-react";

export default function ActiveSessions() {
  return (
    <AccessGate allow={['super_admin']}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                <div>
                  <CardTitle>Sessões Ativas</CardTitle>
                  <CardDescription>Monitoramento de sessões de usuários autenticados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A visualização de sessões ativas requer configuração adicional de RLS policies na tabela auth.sessions.
                  Esta funcionalidade será implementada em uma atualização futura com políticas de segurança apropriadas.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    </AccessGate>
  );
}
