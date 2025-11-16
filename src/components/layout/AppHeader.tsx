import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, User, LogOut, Sun, Moon, CreditCard, ArrowLeft, Bell, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useTheme } from "next-themes";
import { PlatformNotificationsBell } from "@/components/notifications/PlatformNotificationsBell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  userName?: string;
  userRole?: string;
  onProfileClick?: () => void;
  onSignOut?: () => void;
  showSidebarTrigger?: boolean;
}

export function AppHeader({ userName, userRole, onProfileClick, onSignOut, showSidebarTrigger }: AppHeaderProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Minhas Notificações</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <PlatformNotificationsBell />
          </div>
        </DialogContent>
      </Dialog>
      
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-glass">
      <div className="container mx-auto px-3 md:px-6 py-2 md:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {showSidebarTrigger && <SidebarTrigger />}
          
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 group">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glass transition-all duration-300 group-hover:shadow-glass-lg group-hover:scale-105">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <h1 className="text-base md:text-xl font-semibold transition-all duration-300 group-hover:text-primary">
              Aprova Criativos
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {userName && (
            <div className="text-right hidden lg:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          )}
          
          {/* Desktop: ExpandableTabs */}
          <div className="hidden md:block">
            <ExpandableTabs
              tabs={[
                { title: "Minha Conta", icon: User },
                { title: "Minha Assinatura", icon: CreditCard },
                { title: (resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"), icon: resolvedTheme === "dark" ? Sun : Moon },
                { title: "Notificações", icon: Bell },
                { title: "Sair", icon: LogOut },
              ]}
              onChange={(index) => {
                if (index === 0) {
                  navigate("/minha-conta");
                } else if (index === 1) {
                  navigate("/minha-assinatura");
                } else if (index === 2) {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                } else if (index === 3) {
                  setNotificationsOpen(true);
                } else if (index === 4 && onSignOut) {
                  onSignOut();
                }
              }}
              className="bg-background/50"
            />
          </div>

          {/* Mobile: Dropdown compacto */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/minha-conta")}>
                  <User className="h-4 w-4 mr-2" />
                  Minha Conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/minha-assinatura")}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Minha Assinatura
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                  {resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
                  <Bell className="h-4 w-4 mr-2" />
                  Notificações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      </header>
    </>
  );
}
