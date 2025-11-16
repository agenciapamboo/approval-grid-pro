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
  { title: "Notificações", url: "/notificacoes", icon: Bell },
  { title: "Minha Conta", url: "/minha-conta", icon: User },
  { title: "Central de Ajuda", url: "/central-de-ajuda", icon: HelpCircle },
];

export function ClientUserSidebar() {
  const { state } = useSidebar();
  const { client } = useUserData();
  const collapsed = state === "collapsed";

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
