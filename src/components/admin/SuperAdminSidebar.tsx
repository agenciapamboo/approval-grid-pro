import { NavLink } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  Settings,
  Shield,
  Bell,
  Database,
  CreditCard,
  BarChart3,
  Lock,
  UserCheck,
  History,
  Monitor,
  UserCog,
  UsersRound,
  LayoutDashboard
} from "lucide-react";
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
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    category: "principal"
  },
  {
    title: "Agências",
    url: "/agencias",
    icon: Building2,
    category: "principal"
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    category: "principal"
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    category: "financeiro"
  },
  {
    title: "Usuários",
    url: "/admin/usuarios",
    icon: UserCheck,
    category: "seguranca"
  },
  {
    title: "Auditoria",
    url: "/admin/auditoria-usuarios",
    icon: History,
    category: "seguranca"
  },
  {
    title: "Dashboard Segurança",
    url: "/admin/dashboard-seguranca",
    icon: Shield,
    category: "seguranca"
  },
  {
    title: "Sessões Ativas",
    url: "/admin/sessoes-ativas",
    icon: Monitor,
    category: "seguranca"
  },
  {
    title: "Membros Equipe",
    url: "/admin/membros-equipe",
    icon: UsersRound,
    category: "sistema"
  },
  {
    title: "Tickets Suporte",
    url: "/admin/tickets",
    icon: Bell,
    category: "sistema"
  },
  {
    title: "Configuração Stripe",
    url: "/admin/stripe",
    icon: CreditCard,
    category: "integracao"
  },
  {
    title: "Diagnóstico Stripe",
    url: "/admin/stripe-diagnostic",
    icon: FileText,
    category: "integracao"
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    category: "sistema"
  }
];

const categories = [
  { id: "principal", label: "Principal" },
  { id: "financeiro", label: "Financeiro" },
  { id: "seguranca", label: "Segurança" },
  { id: "integracao", label: "Integrações" },
  { id: "sistema", label: "Sistema" }
];

export function SuperAdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
      <SidebarContent className="bg-sidebar">
        {categories.map((category) => {
          const items = menuItems.filter(item => item.category === category.id);
          if (items.length === 0) return null;

          return (
            <SidebarGroup key={category.id}>
              {!isCollapsed && <SidebarGroupLabel>{category.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            isActive ? "bg-accent text-accent-foreground" : ""
                          }
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
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
