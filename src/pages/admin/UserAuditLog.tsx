import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { UserAuditLog as UserAuditLogComponent } from "@/components/admin/UserAuditLog";

export default function UserAuditLog() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <UserAuditLogComponent />
      </main>
      <AppFooter />
    </div>
  );
}
