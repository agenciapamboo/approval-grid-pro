import { Link } from "react-router-dom";

export function AppHeader() {
  return (
    <header className="bg-gradient-to-r from-primary to-secondary border-b border-primary/20">
      <div className="container mx-auto px-4 py-4">
        <Link to="/dashboard" className="inline-block">
          <h1 className="font-poppins font-bold text-2xl tracking-tight text-white">
            Aprova Criativos
          </h1>
        </Link>
      </div>
    </header>
  );
}
