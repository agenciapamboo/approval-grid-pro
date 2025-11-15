import { AppLayout } from "@/components/layout/AppLayout";
import { UsersManager as UsersManagerComponent } from "@/components/admin/UsersManager";
import AccessGate from "@/components/auth/AccessGate";

export default function UsersManager() {
  return (
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <UsersManagerComponent />
        </div>
      </AppLayout>
    </AccessGate>
  );
}
