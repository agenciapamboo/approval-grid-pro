import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  KanbanSquare, 
  Paintbrush, 
  Ticket, 
  MessageSquare, 
  Bell, 
  Settings,
  UsersRound
} from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import { useUserData } from "@/hooks/useUserData";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Equipe", url: "/admin/membros-equipe", icon: UsersRound },
  { title: "Calendário", url: "/agenda", icon: Calendar },
  { title: "Kanban", url: "/kanban", icon: KanbanSquare },
  { title: "Solicitações de Criativos", url: "/creative-requests", icon: Paintbrush },
  { title: "Tickets da Agência", url: "/agencia/tickets", icon: Ticket },
  { title: "Meus Tickets", url: "/meus-tickets", icon: MessageSquare },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Configurações", url: "/agencia/configuracoes", icon: Settings },
];

export function AgencyAdminSidebar({ isMobile = false }: { isMobile?: boolean }) {
  const { state } = useSidebar();
  const { agency } = useUserData();
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
          </ul>
        </nav>
      </div>
    );
  }

  // Renderização desktop (usando Sidebar shadcn)
  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
