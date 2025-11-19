import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import { AgencyAdminSidebar } from "@/components/admin/AgencyAdminSidebar";
import { ClientUserSidebar } from "@/components/client/ClientUserSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/hooks/useUserData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientSelectorDialog } from "@/components/admin/ClientSelectorDialog";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { role, profile, loading } = useUserData();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Detectar tablet (768px - 1023px)
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1024);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);
  
  const isClientDetailsPage = location.pathname.includes('/cliente/');
  const clientId = isClientDetailsPage 
    ? location.pathname.split('/cliente/')[1]?.split('/')[0]
    : null;

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
    return (
      <div className="flex min-h-screen w-full flex-col pb-16">
        <AppHeader 
          userName={profile?.name} 
          userRole={role ? getRoleLabel(role) : undefined} 
          onSignOut={handleSignOut} 
          showSidebarTrigger={false} 
        />
        
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0 overflow-y-auto">
            <SidebarProvider defaultOpen={true}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-sidebar-border">
                  <h2 className="text-lg font-semibold text-sidebar-foreground">Menu Principal</h2>
                </div>
                <div className="flex-1">
                  <SidebarComponent onSignOut={handleSignOut} isMobile={true} />
                </div>
              </div>
            </SidebarProvider>
          </SheetContent>
        </Sheet>

        <main className="flex-1">{children}</main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border shadow-lg">
          <div className="flex items-center justify-around h-16 px-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSheetOpen(true)} 
              className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">Menu</span>
            </Button>
            
            {role === 'client_user' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/conteudo')} 
                  className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Conteúdo</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/solicitar-criativo')} 
                  className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Solicitar</span>
                </Button>
              </>
            )}
            
            {(role === 'agency_admin' || role === 'team_member') && (
              <>
                {isClientDetailsPage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/cliente/${clientId}`)}
                    className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Conteúdos</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClientSelector(true)}
                    className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Conteúdos</span>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/creative-requests')} 
                  className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Solicitações</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <ClientSelectorDialog 
          open={showClientSelector} 
          onOpenChange={setShowClientSelector} 
        />

        <AppFooter />
      </div>
    );
  }

  if (!showSidebar) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <AppHeader 
          userName={profile?.name} 
          userRole={role ? getRoleLabel(role) : undefined} 
          onSignOut={handleSignOut} 
          showSidebarTrigger={false} 
        />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        {SidebarComponent && <SidebarComponent onSignOut={handleSignOut} />}
        <div className="flex flex-1 flex-col pb-0 md:pb-0 lg:pb-0" style={{ paddingBottom: isTablet ? '4rem' : '0' }}>
          <AppHeader 
            userName={profile?.name} 
            userRole={role ? getRoleLabel(role) : undefined} 
            onSignOut={handleSignOut}
            showSidebarTrigger={true}
          />
          <main className="flex-1 p-6">{children}</main>
          <AppFooter />
        </div>

        {/* Bottom Navigation Bar para Tablet */}
        {isTablet && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border shadow-lg">
            <div className="flex items-center justify-around h-16 px-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSheetOpen(true)} 
                className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
              >
                <Menu className="h-5 w-5" />
                <span className="text-xs">Menu</span>
              </Button>
              
              {role === 'client_user' && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/conteudo')} 
                    className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Conteúdo</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/solicitar-criativo')} 
                    className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Solicitar</span>
                  </Button>
                </>
              )}
              
              {(role === 'agency_admin' || role === 'team_member') && (
                <>
                  {isClientDetailsPage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/cliente/${clientId}`)}
                      className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Conteúdos</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClientSelector(true)}
                      className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Conteúdos</span>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/creative-requests')} 
                    className="flex flex-col items-center gap-1 text-sidebar-foreground hover:bg-sidebar-accent h-auto py-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Solicitações</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sheet para tablet também */}
        {isTablet && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r-0 overflow-y-auto">
              <SidebarProvider defaultOpen={true}>
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-sidebar-border">
                    <h2 className="text-lg font-semibold text-sidebar-foreground">Menu Principal</h2>
                  </div>
                  <div className="flex-1">
                    <SidebarComponent onSignOut={handleSignOut} isMobile={true} />
                  </div>
                </div>
              </SidebarProvider>
            </SheetContent>
          </Sheet>
        )}

        <ClientSelectorDialog 
          open={showClientSelector} 
          onOpenChange={setShowClientSelector} 
        />
      </div>
    </SidebarProvider>
  );
}
