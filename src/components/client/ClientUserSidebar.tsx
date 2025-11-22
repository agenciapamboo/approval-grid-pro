import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  List, 
  Ticket, 
  HelpCircle, 
  Bell, 
  User,
  UserCheck,
  LogOut
} from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meu Conteúdo", url: "/conteudo", icon: FileText },
  { title: "Solicitar Criativo", url: "/solicitar-criativo", icon: Plus },
  { title: "Minhas Solicitações", url: "/minhas-solicitacoes", icon: List },
  { title: "Gerenciar Aprovadores", url: "/gerenciar-aprovadores", icon: UserCheck },
  { title: "Meus Tickets", url: "/meus-tickets", icon: Ticket },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Minha Conta", url: "/minha-conta", icon: User },
  { title: "Central de Ajuda", url: "/central-de-ajuda", icon: HelpCircle },
];

interface ClientUserSidebarProps {
  onSignOut?: () => void;
  isMobile?: boolean;
}

export function ClientUserSidebar({ onSignOut, isMobile = false }: ClientUserSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Renderização mobile simplificada (sem componente Sidebar shadcn)
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                <NavLink 
                  to={item.url} 
                  end={item.url === "/dashboard"}
                  className="flex items-center gap-3 hover:bg-sidebar-accent rounded-md px-3 py-2.5 text-sidebar-foreground transition-colors"
                  activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              </li>
            ))}
            
            {onSignOut && (
              <>
                <li className="my-2">
                  <div className="border-t border-sidebar-border"></div>
                </li>
                <li>
                  <button
                    onClick={onSignOut}
                    className="flex items-center gap-3 hover:bg-sidebar-accent rounded-md px-3 py-2.5 text-sidebar-foreground transition-colors w-full text-left"
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">Sair</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    );
  }

  // Renderização desktop (usando Sidebar shadcn com hover - barra verde vertical)
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Principal</SidebarGroupLabel>}
          
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-3 py-2 text-sidebar-foreground"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {onSignOut && (
                <>
                  <SidebarMenuItem>
                    <div className="border-t border-sidebar-border my-2" />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={onSignOut}
                        className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-3 py-2 text-sidebar-foreground w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        {!collapsed && <span>Sair</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
