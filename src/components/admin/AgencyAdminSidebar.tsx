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

const categories = [
  { 
    id: "principal", 
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Clientes", url: "/clientes", icon: Users },
    ]
  },
  { 
    id: "gestao", 
    label: "Gestão de Conteúdo",
    items: [
      { title: "Calendário", url: "/agenda", icon: Calendar },
      { title: "Kanban", url: "/kanban", icon: KanbanSquare },
      { title: "Solicitações de Criativos", url: "/creative-requests", icon: Paintbrush },
    ]
  },
  { 
    id: "suporte", 
    label: "Suporte",
    items: [
      { title: "Tickets da Agência", url: "/agencia/tickets", icon: Ticket },
      { title: "Meus Tickets", url: "/meus-tickets", icon: MessageSquare },
    ]
  },
  { 
    id: "sistema", 
    label: "Sistema",
    items: [
      { title: "Notificações", url: "/notificacoes", icon: Bell },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ]
  }
];

export function AgencyAdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
      <SidebarContent className="bg-sidebar">
        {categories.map((category) => (
          <SidebarGroup key={category.id}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/70">
                {category.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md px-3 py-2 text-sidebar-foreground"
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
