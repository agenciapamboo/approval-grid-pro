import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Check, Star, Info, ArrowRight } from "lucide-react";
import { STRIPE_PRODUCTS, StripePlan, StripePriceInterval, PLAN_ORDER } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

interface PricingProps {
  title?: string;
  description?: string;
  className?: string;
}

export function Pricing({ 
  title = "Escolha o plano ideal para você",
  description = "Todos os planos incluem acesso à plataforma, ferramentas de geração de leads e suporte dedicado.",
  className 
}: PricingProps) {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<StripePriceInterval>("monthly");

  // Dados dos planos baseados em STRIPE_PRODUCTS (sem Creator e unlimited)
  const plans = PLAN_ORDER
    .filter(plan => plan !== 'unlimited' && plan !== 'creator') // Remove plano interno e creator
    .map(plan => {
      const product = STRIPE_PRODUCTS[plan];
      const isFree = 'free' in product && product.free;
      const monthlyPrice = ('prices' in product && product.prices) 
        ? product.prices.monthly.amount / 100 
        : 0;
      const annualPrice = ('prices' in product && product.prices) 
        ? product.prices.annual.amount / 100 
        : 0;
      
      // Features baseadas no plano
      const getMetrics = (planKey: StripePlan): { performance: string; retrabalho: string; rejeicao: string } => {
        switch (planKey) {
          case 'creator':
            return {
              performance: "70%",
              retrabalho: "30%",
              rejeicao: "20%"
            };
          case 'eugencia':
            return {
              performance: "80%",
              retrabalho: "20%",
              rejeicao: "15%"
            };
          case 'socialmidia':
            return {
              performance: "85%",
              retrabalho: "15%",
              rejeicao: "10%"
            };
          case 'fullservice':
            return {
              performance: "95%",
              retrabalho: "5%",
              rejeicao: "5%"
            };
          default:
            return {
              performance: "-",
              retrabalho: "-",
              rejeicao: "-"
            };
        }
      };

      const getFeatures = (planKey: StripePlan): string[] => {
        switch (planKey) {
          case 'creator':
            return [
              "Clientes ilimitados",
              "Aprovadores ilimitados",
              "Até 80 criativos/mês",
              "80 criativos ou 30 dias de histórico",
              "Controle do consumo do contrato dos clientes",
              "Usuário por cliente para aprovação",
              "1 membro na equipe",
              "Aprovação de criativos direto na plataforma",
              "Agendamento de postagens",
              "Download de mídia pela janela de aprovação",
              "Histórico de criativos publicados",
              "Logs e histórico de aprovações",
              "Notificações por e-mail",
              "Agenda por cliente"
            ];
          case 'eugencia':
            return [
              "Todos os recursos do Creator",
              "Clientes ilimitados",
              "Aprovadores ilimitados",
              "100 criativos/mês",
              "200 criativos ou 60 dias de histórico",
              "Solicitação de criativos com briefing",
              "1 membro na equipe",
              "Agendamento de postagens automáticas",
              "Notificações automáticas por e-mail"
            ];
          case 'socialmidia':
            return [
              "Todos os recursos do Creator e Eugência",
              "Clientes ilimitados",
              "Aprovadores ilimitados",
              "120 postagens por mês",
              "300 criativos ou 90 dias de histórico",
              "Até 3 membros na equipe",
              "Aprovação automática pós-deadline",
              "Notificações automáticas por e-mail e WhatsApp",
              "Agenda por cliente",
              "Histórico completo de criativos publicados",
              "Download de mídias pela janela de aprovação",
              "Logs e histórico detalhado de feedbacks por versão"
            ];
          case 'fullservice':
            return [
              "Todos os recursos do Creator, Eugência e Social Mídia",
              "Clientes ilimitados",
              "Aprovadores ilimitados",
              "Postagens ilimitadas",
              "500 criativos ou 90 dias de histórico",
              "Membros da equipe ilimitados",
              "Aprovação automática pós-deadline",
              "Aprovação de conteúdos gráficos (PDF, Key Visuals, peças offline)",
              "Link direto para fornecedores baixarem arquivos fechados",
              "Agenda geral consolidada",
              "Kanban da equipe",
              "Notificações internas automáticas para equipe",
              "Notificações externas por e-mail e WhatsApp"
            ];
          default:
            return [];
        }
      };

      const getDescription = (planKey: StripePlan): string => {
        switch (planKey) {
          case 'creator':
            return "Ideal para influencers e criadores independentes que desejam centralizar aprovações e agendamentos básicos sem custo.";
          case 'eugencia':
            return "Perfeito para autônomos e microagências que precisam de um fluxo criativo organizado, com solicitações e aprovações simplificadas.";
          case 'socialmidia':
            return "Feito para pequenas equipes e agências de social media que buscam automação e comunicação direta com seus clientes.";
          case 'fullservice':
            return "Projetado para agências completas e equipes multidisciplinares que gerenciam múltiplos clientes, campanhas e fornecedores.";
          default:
            return "";
        }
      };

      const calculateSavings = (): number => {
        if (isFree || monthlyPrice === 0) return 0;
        const monthlyX12 = monthlyPrice * 12;
        return Math.round(((monthlyX12 - annualPrice) / monthlyX12) * 100);
      };

      const getMonthlyEquivalent = (): string => {
        if (isFree || annualPrice === 0) return "0";
        return (annualPrice / 12).toFixed(2).replace('.', ',');
      };

      const isPopular = plan === 'socialmidia';
      const metrics = getMetrics(plan);

      // Ajustar nomes dos planos
      const getDisplayName = (planKey: StripePlan): string => {
        switch (planKey) {
          case 'eugencia':
            return 'Eugência';
          case 'socialmidia':
            return 'Social Mídia';
          case 'fullservice':
            return 'Full Service';
          default:
            return product.name;
        }
      };

      return {
        id: plan,
        name: getDisplayName(plan),
        price: monthlyPrice.toFixed(2).replace('.', ','),
        yearlyPrice: annualPrice.toFixed(2).replace('.', ','),
        monthlyEquivalent: getMonthlyEquivalent(),
        savings: calculateSavings(),
        period: "por mês",
        features: getFeatures(plan),
        description: getDescription(plan),
        buttonText: isFree ? "Começar Grátis" : "Assinar",
        isPopular,
        isFree,
        metrics
      };
    });

  // Dados do plano Creator separadamente
  const creatorPlan = (() => {
    const product = STRIPE_PRODUCTS.creator;
    const planKey: StripePlan = 'creator';
    const metrics = {
      performance: "70%",
      retrabalho: "30%",
      rejeicao: "20%"
    };
    const features = [
      "Clientes ilimitados",
      "Aprovadores ilimitados",
      "Até 80 criativos/mês",
      "80 criativos ou 30 dias de histórico",
      "Controle do consumo do contrato dos clientes",
      "Usuário por cliente para aprovação",
      "1 membro na equipe",
      "Aprovação de criativos direto na plataforma",
      "Agendamento de postagens",
      "Download de mídia pela janela de aprovação",
      "Histórico de criativos publicados",
      "Logs e histórico de aprovações",
      "Notificações por e-mail",
      "Agenda por cliente"
    ];
    return {
      id: 'creator',
      name: 'Creator',
      description: "Ideal para influencers e criadores independentes que desejam centralizar aprovações e agendamentos básicos sem custo.",
      features,
      metrics
    };
  })();

  const handleSelectPlan = (planId: string) => {
    navigate(`/auth?signup=true&plan=${planId}&billing=${billingCycle}`);
  };

  const getPrice = (plan: typeof plans[0]) => {
    return billingCycle === "monthly" ? plan.price : plan.yearlyPrice;
  };

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (plan.isFree) return "Gratuito";
    const price = getPrice(plan);
    return `R$ ${price}`;
  };

  return (
    <div className={cn("w-full py-12 px-4", className)}>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
            {description}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Label htmlFor="billing-toggle" className="text-sm font-medium">
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === "annual"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
          />
          <Label htmlFor="billing-toggle" className="text-sm font-medium">
            Anual
            {billingCycle === "annual" && (
              <Badge variant="default" className="ml-2 bg-green-600">
                Economia de até {Math.max(...plans.map(p => p.savings))}%
              </Badge>
            )}
          </Label>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const displayPrice = getDisplayPrice(plan);
            const isAnnual = billingCycle === "annual";
            const monthlyPriceFormatted = plan.price.replace(',', '.');

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.isPopular && "border-primary shadow-lg ring-2 ring-primary/20"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold uppercase">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-sm mt-2 min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Price Display */}
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      {displayPrice}
                    </div>
                    {!plan.isFree && (
                      <div className="text-sm text-muted-foreground">
                        {isAnnual ? (
                          <div className="space-y-1">
                            <Badge className="bg-green-600 text-white hover:bg-green-700">
                              Economia anual de {plan.savings}%
                            </Badge>
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-sm font-semibold text-muted-foreground">
                                de{" "}
                                <span className="line-through">
                                  R$ {monthlyPriceFormatted}/mês
                                </span>
                              </span>
                              <span className="text-sm text-muted-foreground">por</span>
                              <span className="text-sm font-semibold text-foreground">
                                R$ {plan.monthlyEquivalent}/mês
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              R$ {plan.yearlyPrice}/ano
                            </div>
                          </div>
                        ) : (
                          <span>/mês</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 mt-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                    
                    {/* Métricas de Performance no final */}
                    <li className="mt-4 pt-4 border-t">
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h4 className="text-sm font-semibold mb-3">Métricas de Performance</h4>
                        <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Performance de Aprovação:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Saiba quando seus criativos estão indo bem
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Nível de Retrabalho:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entenda quando há mais trabalho do que o necessário
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Índice de Rejeição:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entenda quando há alinhamentos e reposicionamentos a fazer
                              </p>
                            </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={cn(
                      "w-full",
                      plan.isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : plan.isFree
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    )}
                    onClick={() => handleSelectPlan(plan.id)}
                    variant={plan.isPopular ? "default" : plan.isFree ? "default" : "outline"}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Bloco Creator - Discreto */}
        <div className="mt-6">
          {/* Descrição com fundo verde */}
          <div className="p-4 rounded-lg bg-[#00B878] text-white mb-3">
            <p className="text-sm font-medium">
              Ideal para influencers e criadores independentes que desejam centralizar aprovações e agendamentos sem custo.
            </p>
          </div>
          
          <div className="p-3 border border-border/50 rounded-lg bg-muted/30">
            <Dialog>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Texto, link com ícone info e seta */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>É criador de conteúdo?</span>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm font-normal text-primary hover:text-primary/80 hover:bg-transparent"
                    >
                      Conheça o plano Creator
                    </Button>
                  </DialogTrigger>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 rounded-full hover:bg-muted"
                        aria-label="Informações do plano Creator"
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[calc(100vw-2rem)] md:w-[500px] p-6" 
                      align="start" 
                      side="bottom"
                      sideOffset={8}
                    >
                      <div className="space-y-4">
                        <h4 className="font-semibold text-base mb-4">Creator</h4>
                        
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            {creatorPlan.description}
                          </p>
                          <h5 className="font-medium text-sm mb-3">Informações do plano:</h5>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {creatorPlan.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1 flex-shrink-0">•</span>
                                <span className="text-muted-foreground">{feature}</span>
                              </div>
                            ))}
                            
                            {/* Métricas de Performance no final */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-semibold mb-3">Métricas de Performance</h5>
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <div className="text-sm">
                                      <span className="font-medium">Performance de Aprovação:</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Saiba quando seus criativos estão indo bem
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-sm">
                                      <span className="font-medium">Nível de Retrabalho:</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Entenda quando há mais trabalho do que o necessário
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-sm">
                                      <span className="font-medium">Índice de Rejeição:</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Entenda quando há alinhamentos e reposicionamentos a fazer
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </div>

                {/* Botão que abre popup */}
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    Saiba mais
                  </Button>
                </DialogTrigger>
              </div>

              {/* Dialog compartilhado */}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="space-y-4">
                  <h4 className="font-semibold text-xl mb-4">Creator</h4>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {creatorPlan.description}
                    </p>
                    <h5 className="font-medium text-sm mb-3">Informações do plano:</h5>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {creatorPlan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1 flex-shrink-0">•</span>
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                      
                      {/* Métricas de Performance no final */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <h5 className="text-sm font-semibold mb-3">Métricas de Performance</h5>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Performance de Aprovação:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Saiba quando seus criativos estão indo bem
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Nível de Retrabalho:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entenda quando há mais trabalho do que o necessário
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">Índice de Rejeição:</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entenda quando há alinhamentos e reposicionamentos a fazer
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={() => {
                        handleSelectPlan('creator');
                      }}
                    >
                      Assine Agora
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

