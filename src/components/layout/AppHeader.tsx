import { Link } from "react-router-dom";

export function AppHeader() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <Link to="/dashboard" className="inline-block">
          <h1 className="font-poppins font-bold text-2xl tracking-tight">
            Aprova Criativos
          </h1>
        </Link>
      </div>
    </header>
  );
}
