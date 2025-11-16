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

const categories = [
  { 
    id: "principal", 
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Meu Conteúdo", url: "/conteudo", icon: FileText },
    ]
  },
  { 
    id: "acoes", 
    label: "Ações",
    items: [
      { title: "Solicitar Criativo", url: "/solicitar-criativo", icon: Plus },
      { title: "Minhas Solicitações", url: "/minhas-solicitacoes", icon: List },
    ]
  },
  { 
    id: "gerenciar", 
    label: "Gerenciar",
    items: [
      { title: "Gerenciar Aprovadores", url: "/gerenciar-aprovadores", icon: UserCheck },
      { title: "Meus Tickets", url: "/meus-tickets", icon: Ticket },
    ]
  },
  { 
    id: "preferencias", 
    label: "Preferências",
    items: [
      { title: "Notificações", url: "/notificacoes", icon: Bell },
      { title: "Minha Conta", url: "/minha-conta", icon: User },
      { title: "Central de Ajuda", url: "/central-de-ajuda", icon: HelpCircle },
    ]
  }
];

export function ClientUserSidebar() {
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
