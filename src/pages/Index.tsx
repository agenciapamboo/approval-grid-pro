import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Users, Zap, Instagram, Facebook, MessageSquare, ArrowRight, ChevronRight, Menu, X, BarChart3, Calendar, FileText, TrendingUp, Bell, DollarSign, Shield, Sparkles, Target, Layers } from "lucide-react";
import { Pricing } from "@/components/blocks/pricing";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
const Index = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
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
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-sm border-b shadow-sm" : "bg-transparent"}`}>
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
              {isAuthenticated ? <Button onClick={() => navigate("/dashboard")} variant="default">
                  Ir para Dashboard
                </Button> : <div className="flex items-center gap-3">
                  <Button onClick={() => navigate("/auth")} variant="ghost">
                    Entrar
                  </Button>
                  <Button onClick={() => navigate("/auth?signup=true")} variant="default">
                    Começar Grátis
                  </Button>
                </div>}
            </nav>

            {/* Mobile Menu Button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && <nav className="md:hidden pt-4 pb-2 flex flex-col gap-3 bg-[#f2f7f6] px-[10px]">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors py-2" onClick={() => setMenuOpen(false)}>
                Recursos
              </a>
              <a href="#benefits" className="text-sm font-medium hover:text-primary transition-colors py-2" onClick={() => setMenuOpen(false)}>
                Benefícios
              </a>
              <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors py-2" onClick={() => setMenuOpen(false)}>
                Como Funciona
              </a>
              {isAuthenticated ? <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Ir para Dashboard
                </Button> : <>
                  <Button onClick={() => navigate("/auth")} variant="ghost" className="w-full">
                    Entrar
                  </Button>
                  <Button onClick={() => navigate("/auth?signup=true")} className="w-full">
                    Começar Grátis
                  </Button>
                </>}
            </nav>}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Aprovação, Agendamento e Publicação Automática
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              A plataforma completa para gerenciar criativos e clientes
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Kanban visual, calendário integrado, aprovação em 1 clique e publicação automática. 
              Controle total de limites, métricas e performance em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="text-lg px-8 group">
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({
              behavior: 'smooth'
            })} className="text-lg px-8">
                Ver Como Funciona
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background" />)}
                </div>
                <span>+500 agências confiam na plataforma</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Configure sua agência em minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>70% menos tempo em aprovações</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Expandida com 5 blocos */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Recursos Poderosos para Agilizar seu Workflow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Plataforma completa com gestão de conteúdo, aprovação inteligente e publicação automatizada
            </p>
          </div>

          {/* Bloco 1: Gestão de Conteúdo */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">Gestão de Conteúdo</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Layers, title: "Kanban Visual", desc: "Organize produção com colunas customizáveis e drag & drop" },
                { icon: Calendar, title: "Calendário Inteligente", desc: "Visualize e agende conteúdos por cliente, com eventos históricos" },
                { icon: FileText, title: "Upload e Organização", desc: "Múltiplas mídias, carrosséis, geração automática de thumbnails" },
                { icon: BarChart3, title: "Analytics de Performance", desc: "Top categorias, keywords, taxa de aprovação histórica" }
              ].map((item, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 2: Aprovação Inteligente */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">Aprovação Inteligente</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Zap, title: "Aprovação em 1 Clique", desc: "Interface simplificada para aprovar instantaneamente" },
                { icon: Clock, title: "Auto-Aprovação por Prazo", desc: "Configure deadlines e aprove automaticamente" },
                { icon: MessageSquare, title: "Comentários por Versão", desc: "Histórico completo de feedbacks organizados" },
                { icon: TrendingUp, title: "Controle de Ajustes", desc: "Acompanhe iterações e taxa de rework" }
              ].map((item, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 3: Publicação Automatizada */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Instagram className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">Publicação Automatizada</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Instagram, title: "Publicação Automática", desc: "Instagram, Facebook e outras redes após aprovação" },
                { icon: Calendar, title: "Agendamento Inteligente", desc: "Melhores horários e planejamento por calendário" },
                { icon: Target, title: "Rastreamento com Pixels", desc: "Meta Pixel, Google Analytics, TikTok integrados" },
                { icon: Sparkles, title: "Integração Social", desc: "Conecte contas e gerencie tokens automaticamente" }
              ].map((item, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 4: Controle de Limites */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">Controle de Limites</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: TrendingUp, title: "Métricas em Tempo Real", desc: "Dashboard com uso de posts, storage e recursos" },
                { icon: Bell, title: "Alertas de Quota", desc: "Notificações em 70%, 90% e 100% de uso" },
                { icon: BarChart3, title: "Histórico de Consumo", desc: "Acompanhe uso mensal e evolução por cliente" },
                { icon: Sparkles, title: "Sugestões de Otimização", desc: "Recomendações para melhor aproveitamento" }
              ].map((item, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 5: Gestão Financeira */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">Gestão Financeira</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: DollarSign, title: "Painel Financeiro", desc: "MRR, ticket médio e projeções completas" },
                { icon: TrendingUp, title: "Métricas de Receita", desc: "Acompanhe crescimento e churn em tempo real" },
                { icon: BarChart3, title: "Custo por Cliente", desc: "Análise detalhada de lucratividade" },
                { icon: Shield, title: "Controle de Custos", desc: "Gerencie custos operacionais e taxas" }
              ].map((item, i) => (
                <div key={i} className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Atualizada para Agências e Clientes */}
      <section id="benefits" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Benefícios para Toda sua Operação
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Soluções específicas para agências e clientes trabalharem melhor juntos
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Para Agências */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-10 h-10 text-primary" />
                <h3 className="text-2xl font-bold">Para Agências</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Reduza até 70% o tempo de aprovações",
                  "Gerencie múltiplos clientes em um lugar",
                  "Kanban e calendário integrados",
                  "Publique automaticamente após aprovação",
                  "Controle completo de limites por cliente",
                  "Métricas de performance (aprovação/ajuste/rejeição)",
                  "Gestão de equipe com permissões granulares",
                  "Dashboard financeiro com MRR e projeções"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 bg-background/50 p-3 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Para Clientes */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
                <h3 className="text-2xl font-bold">Para Clientes</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Aprove conteúdos em 1 clique",
                  "Visualize tudo em um grid organizado",
                  "Solicite criativos facilmente",
                  "Gerencie seus aprovadores",
                  "Acompanhe sua quota mensal em tempo real",
                  "Histórico completo de publicações",
                  "Notificações personalizadas (Email/WhatsApp)",
                  "Interface intuitiva e fácil de usar"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 bg-background/50 p-3 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="text-lg px-8">
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works - Atualizado para 4 passos */}
      <section id="how-it-works" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Do planejamento à publicação em 4 passos simples
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Users,
                title: "Configure sua Agência",
                description: "Cadastre clientes, configure limites e permissões, conecte redes sociais"
              },
              {
                step: "2",
                icon: Layers,
                title: "Crie e Organize",
                description: "Use o Kanban para planejar, faça upload de criativos, agende no calendário"
              },
              {
                step: "3",
                icon: CheckCircle2,
                title: "Envie para Aprovação",
                description: "Cliente recebe notificação, aprova/ajusta/rejeita em 1 clique, auto-aprovação por prazo"
              },
              {
                step: "4",
                icon: Zap,
                title: "Publique Automaticamente",
                description: "Publicação automática após aprovação, rastreamento com pixels, métricas de performance"
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                {index < 3 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -translate-y-1/2 z-0" />
                )}
                <div className="bg-background p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-4">
                    {step.step}
                  </div>
                  <step.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2 text-center">{step.title}</h3>
                  <p className="text-sm text-muted-foreground text-center">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="text-lg px-8">
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl mb-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Planos que Crescem com sua Agência
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Controle total de posts mensais, criativos arquivados, membros de equipe e features premium
            </p>
          </div>
        </div>
        <Pricing 
          title=""
          description=""
        />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas sobre a plataforma
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Como funciona o limite de posts mensais?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Cada plano tem um limite de posts que podem ser criados por mês. O contador é resetado todo dia 1º de cada mês. 
                Você pode acompanhar o uso em tempo real no dashboard, com alertas em 70%, 90% e 100% da quota.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                O que acontece se eu exceder minha quota?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Quando você atingir 100% da quota, receberá um alerta sugerindo upgrade para um plano superior. 
                Você pode continuar criando conteúdo, mas recomendamos fazer upgrade para garantir todos os recursos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Como funciona a auto-aprovação por prazo?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Você pode configurar um prazo (deadline) ao enviar conteúdo para aprovação. Se o cliente não der feedback 
                até o prazo, o sistema aprova automaticamente o conteúdo. Isso evita gargalos e garante que sua produção flua.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Posso adicionar mais membros à minha equipe?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim! O limite de membros varia por plano. Você pode adicionar designers, redatores e outros profissionais 
                com permissões granulares. Cada membro pode ser atribuído a clientes específicos no Kanban.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Como funciona a publicação automática nas redes sociais?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Após conectar as contas do Facebook e Instagram do seu cliente, você pode habilitar a publicação automática. 
                Quando o conteúdo for aprovado, ele é publicado automaticamente na hora agendada. Também rastreamos com pixels 
                para análise de performance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                O histórico de conteúdos tem limite?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim, cada plano oferece um período específico de histórico (30, 90, 180 dias ou ilimitado). 
                Após esse período, conteúdos antigos são arquivados automaticamente para otimizar performance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-background border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                Posso personalizar notificações para cada cliente?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim! Cada cliente pode configurar suas preferências de notificações: Email, WhatsApp ou Webhooks customizados. 
                Você também pode definir quais eventos geram notificações (nova aprovação, ajuste solicitado, publicação, etc).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
              <Button size="lg" variant="secondary" onClick={() => navigate("/auth?signup=true")} className="text-lg px-8">
                Criar Conta Grátis
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/20 hover:bg-primary-foreground/10" onClick={() => window.open("mailto:contato@aprovacriativos.com.br", "_blank")}>
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
    </div>;
};
export default Index;