import { AppLayout } from "@/components/layout/AppLayout";
import AccessGate from "@/components/auth/AccessGate";
import { TeamMembersManager as TeamMembersManagerComponent } from "@/components/admin/TeamMembersManager";
import { Users } from "lucide-react";

export default function TeamMembersManager() {
  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 md:h-6 md:w-6" />
              <h1 className="text-xl md:text-2xl font-bold">Gerenciamento de Membros</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Gerencie membros da equipe da agência
            </p>
          </div>
          <TeamMembersManagerComponent />
        </div>
      </AppLayout>
    </AccessGate>
  );
}
