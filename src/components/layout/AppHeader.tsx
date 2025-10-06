import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-primary to-accent shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-[#00B878] flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl text-white font-poppins font-bold transition-transform group-hover:scale-105">
            Aprova Criativos
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {children}
        </div>
      </div>
    </header>
  );
}
