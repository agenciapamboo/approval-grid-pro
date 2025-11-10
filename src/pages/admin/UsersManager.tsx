import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { UsersManager as UsersManagerComponent } from "@/components/admin/UsersManager";

export default function UsersManager() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <UsersManagerComponent />
      </main>
      <AppFooter />
    </div>
  );
}
