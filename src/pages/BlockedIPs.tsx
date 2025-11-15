import { AppLayout } from "@/components/layout/AppLayout";
import { BlockedIPsManager } from "@/components/admin/BlockedIPsManager";
import AccessGate from "@/components/auth/AccessGate";

export default function BlockedIPs() {
  return (
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gerenciamento de IPs Bloqueados</h1>
              <p className="text-muted-foreground">
                Visualize e desbloqueie IPs que foram bloqueados por excesso de tentativas de validação de token
              </p>
            </div>
            
            <BlockedIPsManager />
          </div>
        </div>
      </AppLayout>
    </AccessGate>
  );
}
