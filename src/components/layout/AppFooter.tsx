import { Link } from "react-router-dom";
import { CheckCircle2, Instagram, Facebook } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t py-12 px-4 bg-background w-full">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">Aprova Criativos</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema completo de aprovação e publicação de conteúdos para agências.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-primary transition-colors">Recursos</Link></li>
              <li><Link to="/#benefits" className="hover:text-primary transition-colors">Benefícios</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-primary transition-colors">Como Funciona</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/data-deletion" className="hover:text-primary transition-colors">Exclusão de Dados</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/central-de-ajuda" className="hover:text-primary transition-colors">Central de Ajuda</Link></li>
              <li><a href="mailto:contato@aprovacriativos.com.br" className="hover:text-primary transition-colors">Contato</a></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Login</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Aprova Criativos. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a 
              href="https://www.instagram.com/aprovacriativos" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a 
              href="https://facebook.com/aprovacriativos" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
