import { AppLayout } from "@/components/layout/AppLayout";
import AccessGate from "@/components/auth/AccessGate";
import { TeamMembersManager as TeamMembersManagerComponent } from "@/components/admin/TeamMembersManager";
import { Users } from "lucide-react";

export default function TeamMembersManager() {
  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Gerenciamento de Membros da Equipe</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Gerencie membros da equipe da agência
            </p>
          </div>
          <TeamMembersManagerComponent />
        </div>
      </AppLayout>
    </AccessGate>
  );
}
