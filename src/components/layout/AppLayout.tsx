import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { AgencyAdminSidebar } from "@/components/admin/AgencyAdminSidebar";
import { ClientUserSidebar } from "@/components/client/ClientUserSidebar";
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

  // Determinar qual sidebar mostrar
  const showSidebar = role === "super_admin" || role === "agency_admin" || role === "team_member" || role === "client_user";
  
  let SidebarComponent = null;
  if (role === "super_admin") {
    SidebarComponent = SuperAdminSidebar;
  } else if (role === "agency_admin" || role === "team_member") {
    SidebarComponent = AgencyAdminSidebar;
  } else if (role === "client_user") {
    SidebarComponent = ClientUserSidebar;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        {SidebarComponent && <SidebarComponent />}

        <div className="flex-1 flex flex-col">
          <AppHeader
            userName={profile?.name}
            userRole={role ? getRoleLabel(role) : undefined}
            onSignOut={handleSignOut}
            showSidebarTrigger={showSidebar}
          />

          <main className="flex-1">{children}</main>

          <AppFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
