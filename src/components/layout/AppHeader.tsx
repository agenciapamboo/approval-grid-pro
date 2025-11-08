import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, User, LogOut, Sun, Moon, CreditCard } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { useTheme } from "next-themes";

interface AppHeaderProps {
  userName?: string;
  userRole?: string;
  onProfileClick?: () => void;
  onSignOut?: () => void;
}

export function AppHeader({ userName, userRole, onProfileClick, onSignOut }: AppHeaderProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-glass">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glass transition-all duration-300 group-hover:shadow-glass-lg group-hover:scale-105">
            <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold transition-all duration-300 group-hover:text-primary">
            Aprova Criativos
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {userName && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          )}
          <ExpandableTabs
            tabs={[
              { title: "Minha Conta", icon: User },
              { title: "Minha Assinatura", icon: CreditCard },
              { title: (resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"), icon: resolvedTheme === "dark" ? Sun : Moon },
              { title: "Sair", icon: LogOut },
            ]}
            onChange={(index) => {
              if (index === 0) {
                navigate("/minha-conta");
              } else if (index === 1) {
                navigate("/minha-assinatura");
              } else if (index === 2) {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
              } else if (index === 3 && onSignOut) {
                onSignOut();
              }
            }}
            className="bg-background/50"
          />
        </div>
      </div>
    </header>
  );
}
