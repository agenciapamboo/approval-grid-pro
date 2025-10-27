import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap, 
  Instagram,
  Facebook,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/95 backdrop-blur-sm border-b shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Aprova Criativos</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Recursos
              </a>
              <a href="#benefits" className="text-sm font-medium hover:text-primary transition-colors">
                Benefícios
              </a>
              <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
                Como Funciona
              </a>
              {isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")} variant="default">
                  Ir para Dashboard
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button onClick={() => navigate("/auth")} variant="ghost">
                    Entrar
                  </Button>
                  <Button onClick={() => navigate("/auth")} variant="default">
                    Começar Grátis
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <nav className="md:hidden pt-4 pb-2 flex flex-col gap-3">
              <a 
                href="#features" 
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setMenuOpen(false)}
              >
                Recursos
              </a>
              <a 
                href="#benefits" 
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setMenuOpen(false)}
              >
                Benefícios
              </a>
              <a 
                href="#how-it-works" 
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setMenuOpen(false)}
              >
                Como Funciona
              </a>
              {isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Ir para Dashboard
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/auth")} variant="ghost" className="w-full">
                    Entrar
                  </Button>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Começar Grátis
                  </Button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Aprovação de conteúdos em tempo real
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Simplifique a aprovação de criativos com seus clientes
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Centralize toda comunicação, acelere aprovações e publique automaticamente nas redes sociais. 
              Tudo em uma única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="text-lg px-8 group"
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-lg px-8"
              >
                Ver Como Funciona
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background" />
                  ))}
                </div>
                <span>Usado por 500+ agências</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Sem cartão de crédito</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Recursos Poderosos para Agilizar seu Workflow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar aprovações e publicações de forma profissional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: CheckCircle2,
                title: "Aprovação em Tempo Real",
                description: "Clientes aprovam ou solicitam ajustes diretamente na plataforma, sem trocas infinitas de email."
              },
              {
                icon: Clock,
                title: "Auto-Aprovação por Prazo",
                description: "Configure deadlines e aprove automaticamente conteúdos que não tiverem feedback no prazo."
              },
              {
                icon: Zap,
                title: "Publicação Automática",
                description: "Publique automaticamente em Instagram, Facebook e outras redes após aprovação."
              },
              {
                icon: MessageSquare,
                title: "Comentários Organizados",
                description: "Histórico completo de feedbacks e ajustes solicitados por versão de conteúdo."
              },
              {
                icon: Users,
                title: "Gestão Multi-Cliente",
                description: "Gerencie múltiplos clientes e suas aprovações em um único dashboard centralizado."
              },
              {
                icon: Instagram,
                title: "Integração Social",
                description: "Conecte contas do Facebook e Instagram para publicação direta."
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Por que agências escolhem o Aprova Criativos?
              </h2>
              <div className="space-y-4">
                {[
                  "Reduza em até 70% o tempo de aprovação de conteúdos",
                  "Elimine trocas de email e mensagens perdidas",
                  "Mantenha histórico completo de todas as aprovações",
                  "Publique nas redes sociais com um clique",
                  "Notificações automáticas por email e WhatsApp",
                  "Interface intuitiva que seus clientes vão adorar"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="mt-8"
              >
                Começar Agora
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border">
              <div className="bg-background rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Post Instagram - Cliente A</div>
                    <div className="text-sm text-muted-foreground">Aprovado há 2 minutos</div>
                  </div>
                </div>
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-4" />
                <div className="flex gap-2">
                  <div className="flex-1 bg-primary/10 h-8 rounded" />
                  <div className="flex-1 bg-muted h-8 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              3 passos simples para começar a aprovar conteúdos hoje mesmo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Crie sua Conta",
                description: "Cadastre-se gratuitamente e configure seus clientes em minutos."
              },
              {
                step: "2",
                title: "Envie Conteúdos",
                description: "Faça upload dos criativos e defina prazos de aprovação."
              },
              {
                step: "3",
                title: "Aprove e Publique",
                description: "Cliente aprova e o conteúdo é publicado automaticamente."
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -translate-y-1/2" />
                )}
                <div className="bg-background p-8 rounded-xl border shadow-sm text-center relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-12 text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para transformar suas aprovações?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Junte-se a centenas de agências que já simplificaram seu workflow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Criar Conta Grátis
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8 border-primary-foreground/20 hover:bg-primary-foreground/10"
                onClick={() => window.open("mailto:contato@aprovacriativos.com.br", "_blank")}
              >
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
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
                <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
                <li><a href="#benefits" className="hover:text-primary transition-colors">Benefícios</a></li>
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">Como Funciona</a></li>
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
                <li><a href="mailto:contato@aprovacriativos.com.br" className="hover:text-primary transition-colors">Contato</a></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Login</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 Aprova Criativos. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
