import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  List, 
  Ticket, 
  HelpCircle, 
  Bell, 
  User 
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
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Meu Conteúdo", url: "/conteudo", icon: FileText },
  { title: "Solicitar Criativo", url: "/solicitar-criativo", icon: Plus },
  { title: "Minhas Solicitações", url: "/minhas-solicitacoes", icon: List },
  { title: "Meus Tickets", url: "/meus-tickets", icon: Ticket },
  { title: "Central de Ajuda", url: "/central-de-ajuda", icon: HelpCircle },
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Minha Conta", url: "/minha-conta", icon: User },
];

export function ClientUserSidebar() {
  const { state } = useSidebar();
  const { client } = useUserData();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <div className="p-4 border-b border-border">
        {!collapsed && client && (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
            <p className="text-xs text-muted-foreground">Portal do Cliente</p>
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
