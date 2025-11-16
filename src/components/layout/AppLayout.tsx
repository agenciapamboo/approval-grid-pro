import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { AgencyAdminSidebar } from "@/components/admin/AgencyAdminSidebar";
import { ClientUserSidebar } from "@/components/client/ClientUserSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu, FileText, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
interface AppLayoutProps {
  children: ReactNode;
}
export function AppLayout({
  children
}: AppLayoutProps) {
  const {
    signOut
  } = useAuth();
  const {
    role,
    profile,
    loading
  } = useUserData();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
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
      approver: "Aprovador"
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
  if (isMobile && SidebarComponent) {
    return <div className="flex min-h-screen w-full flex-col pb-16">
        <AppHeader userName={profile?.name} userRole={role ? getRoleLabel(role) : undefined} onSignOut={handleSignOut} showSidebarTrigger={false} />
        
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0 overflow-y-auto">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-sidebar-border">
                <h2 className="text-lg font-semibold text-sidebar-foreground">Menu Principal</h2>
              </div>
              <div className="flex-1">
                <SidebarComponent onSignOut={handleSignOut} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1">{children}</main>

        {/* Barra de navegação inferior fixa */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border shadow-lg">
          <div className="flex items-center justify-around h-16 px-4">
            <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)} className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2">
              <Menu className="h-5 w-5" />
              <span className="text-xs">Menu</span>
            </Button>
            
            {role === 'client_user' && <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/conteudo')} className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Conteúdos</span>
                </Button>
                
                <Button variant="ghost" size="sm" onClick={() => navigate('/solicitar-criativo')} className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Solicitar Criativos</span>
                </Button>
              </>}
            
            {(role === 'agency_admin' || role === 'team_member') && <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/clientes')} className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Clientes</span>
                </Button>
                
                <Button variant="ghost" size="sm" onClick={() => navigate('/creative-requests')} className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Solicitações</span>
                </Button>
              </>}
          </div>
        </div>

        <AppFooter />
      </div>;
  }
  return <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        {SidebarComponent && <SidebarComponent onSignOut={handleSignOut} />}

        <div className="flex-1 flex flex-col">
          <AppHeader userName={profile?.name} userRole={role ? getRoleLabel(role) : undefined} onSignOut={handleSignOut} showSidebarTrigger={showSidebar} />

          <main className="flex-1">{children}</main>

          <AppFooter />
        </div>
      </div>
    </SidebarProvider>;
}