import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
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
        <div className="flex items-center gap-3">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
