import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  KanbanSquare, 
  Paintbrush, 
  Ticket, 
  MessageSquare, 
  Bell, 
  Settings 
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
  { title: "Calendário", url: "/agenda", icon: Calendar },
  { title: "Kanban", url: "/kanban", icon: KanbanSquare },
  { title: "Solicitações Criativas", url: "/agency/creative-requests", icon: Paintbrush },
  { title: "Tickets da Agência", url: "/agencia/tickets", icon: Ticket },
  { title: "Meus Tickets", url: "/meus-tickets", icon: MessageSquare },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AgencyAdminSidebar() {
  const { state } = useSidebar();
  const { agency } = useUserData();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <div className="p-4 border-b border-border">
        {!collapsed && agency && (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{agency.name}</h2>
            <p className="text-xs text-muted-foreground">Painel de Gestão</p>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-3 py-2"
                      activeClassName="bg-muted text-primary font-medium"
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
