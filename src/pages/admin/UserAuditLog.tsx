import { AppLayout } from "@/components/layout/AppLayout";
import { UserAuditLog as UserAuditLogComponent } from "@/components/admin/UserAuditLog";
import AccessGate from "@/components/auth/AccessGate";

export default function UserAuditLog() {
  return (
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <UserAuditLogComponent />
        </div>
      </AppLayout>
    </AccessGate>
  );
}
