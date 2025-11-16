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
}

export function ClientUserSidebar({ onSignOut }: ClientUserSidebarProps) {
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
