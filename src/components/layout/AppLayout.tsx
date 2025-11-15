import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { role, profile, loading } = useUserData();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      agency_admin: "Admin Agência",
      team_member: "Membro Equipe",
      client_user: "Cliente",
      approver: "Aprovador",
    };
    return labels[role] || role;
  };

  if (loading) {
    return null;
  }

  const isSuperAdmin = role === "super_admin";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {isSuperAdmin && <SuperAdminSidebar />}

        <div className="flex-1 flex flex-col">
          <AppHeader
            userName={profile?.name}
            userRole={role ? getRoleLabel(role) : undefined}
            onSignOut={handleSignOut}
            showSidebarTrigger={isSuperAdmin}
          />

          <main className="flex-1">{children}</main>

          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
