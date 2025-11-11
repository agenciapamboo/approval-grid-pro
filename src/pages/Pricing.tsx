import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { getCheckoutErrorMessage } from "@/lib/error-messages";

type BillingCycle = "monthly" | "annual";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  isFree?: boolean;
}

const plans: Plan[] = [
  {
    id: "creator",
    name: "Creator",
    description: "Plano gratuito para começar",
    monthlyPrice: 0,
    annualPrice: 0,
    isFree: true,
    features: [
      "80 posts/mês",
      "80 criativos/mês",
      "30 dias de histórico",
      "1 membro da equipe",
    ],
  },
  {
    id: "eugencia",
    name: "Eugência",
    description: "Para criadores de conteúdo",
    monthlyPrice: 29.70,
    annualPrice: 270,
    features: [
      "100 posts/mês",
      "200 criativos/mês",
      "60 dias de histórico",
      "1 membro da equipe",
    ],
  },
  {
    id: "socialmidia",
    name: "Agência Social Mídia",
    description: "Para pequenas agências",
    monthlyPrice: 49.50,
    annualPrice: 495,
    highlighted: true,
    features: [
      "120 posts/mês",
      "300 criativos/mês",
      "90 dias de histórico",
      "3 membros da equipe",
      "Suporte WhatsApp",
    ],
  },
  {
    id: "fullservice",
    name: "Agência Full Service",
    description: "Solução completa para agências",
    monthlyPrice: 97.20,
    annualPrice: 972,
    features: [
      "Posts ilimitados",
      "500 criativos/mês",
      "90 dias de histórico",
      "Membros ilimitados",
      "Suporte WhatsApp",
      "Aprovação de artes gráficas",
      "Link com fornecedores",
      "Agenda global",
      "Kanban da equipe",
      "Notificações da equipe",
    ],
  },
];

const allFeatures = [
  { name: "Posts por mês", values: ["80", "100", "120", "Ilimitado"] },
  { name: "Criativos por mês", values: ["80", "200", "300", "500"] },
  { name: "Histórico", values: ["30 dias", "60 dias", "90 dias", "90 dias"] },
  { name: "Membros da equipe", values: ["1", "1", "3", "Ilimitado"] },
  { name: "Suporte WhatsApp", values: ["✗", "✗", "✓", "✓"] },
  { name: "Aprovação de artes gráficas", values: ["✗", "✗", "✗", "✓"] },
  { name: "Link com fornecedores", values: ["✗", "✗", "✗", "✓"] },
  { name: "Agenda global", values: ["✗", "✗", "✗", "✓"] },
  { name: "Kanban da equipe", values: ["✗", "✗", "✗", "✓"] },
  { name: "Notificações da equipe", values: ["✗", "✗", "✗", "✓"] },
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { trackEvent } = useConversionTracking();

  const getPrice = (plan: Plan) => {
    return billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
  };

  const getMonthlyEquivalent = (annualPrice: number) => {
    return (annualPrice / 12).toFixed(2);
  };

  const getSavingsPercentage = (monthlyPrice: number, annualPrice: number) => {
    if (monthlyPrice === 0) return 0;
    const annualMonthly = annualPrice / 12;
    return Math.round(((monthlyPrice - annualMonthly) / monthlyPrice) * 100);
  };

  const handleSelectPlan = async (planId: string) => {
    // Prevenir múltiplos cliques
    if (isProcessing) {
      toast.info("Processamento já em andamento. Aguarde...");
      return;
    }

    setIsProcessing(true);
    setLoadingPlan(planId);

    try {
      console.log('[CHECKOUT] Iniciando checkout', { planId, billingCycle });

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Faça login para continuar");
        navigate("/auth");
        return;
      }

      // Handle free plan
      if (planId === "creator") {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            plan: 'creator',
            is_pro: false,
            billing_cycle: null
          })
          .eq('id', user.id);

        if (error) {
          const errorMsg = getCheckoutErrorMessage(error);
          console.error('[CHECKOUT] Erro ao ativar plano free:', error);
          toast.error(errorMsg);
          throw error;
        }

        toast.success("Plano Creator ativado!");
        navigate("/dashboard");
        return;
      }

      // Rastrear evento InitiateCheckout
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        await trackEvent('InitiateCheckout', {
          value: billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice,
          currency: 'BRL',
          subscription_plan: planId,
          subscription_type: billingCycle,
        });
      }

      console.log('[CHECKOUT] Chamando edge function create-checkout');

      // Create checkout session for paid plans
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: planId,
          billingCycle: billingCycle
        },
        headers: {
          'Idempotency-Key': `checkout-${user.id}-${planId}-${billingCycle}-${Date.now()}`
        }
      });

      console.log('[CHECKOUT] Resposta recebida', { data, error });

      if (error) {
        const errorMsg = getCheckoutErrorMessage(error);
        console.error('[CHECKOUT] Erro da função:', error);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!data || !data.url) {
        const errorMsg = "Resposta inválida do servidor. Tente novamente.";
        console.error('[CHECKOUT] Resposta inválida:', data);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[CHECKOUT] Redirecionando para:', data.url);

      // Tentar redirecionar
      try {
        window.location.href = data.url;
      } catch (redirectError) {
        console.error('[CHECKOUT] Erro ao redirecionar:', redirectError);
        toast.error("Não foi possível abrir a página de pagamento. Abrindo em nova aba...");
        window.open(data.url, '_blank');
      }

    } catch (error: any) {
      console.error('[CHECKOUT] Erro completo:', {
        error,
        planId,
        billingCycle,
        timestamp: new Date().toISOString()
      });

      // Mensagem já foi tratada acima se for erro conhecido
      // Apenas exibir toast se for erro não previsto
      if (!error?.message?.includes('Erro') && !error?.message?.includes('não')) {
        const errorMsg = getCheckoutErrorMessage(error);
        toast.error(errorMsg);
      }
    } finally {
      setIsProcessing(false);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha o plano ideal para você</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Comece grátis ou escolha um plano que atenda suas necessidades
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={billingCycle === "monthly" ? "font-semibold" : ""}>
              Mensal
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === "annual"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
            />
            <Label htmlFor="billing-toggle" className={billingCycle === "annual" ? "font-semibold" : ""}>
              Anual
            </Label>
            {billingCycle === "annual" && (
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Economize até 24%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const savings = billingCycle === "annual" && !plan.isFree 
              ? getSavingsPercentage(plan.monthlyPrice, plan.annualPrice)
              : 0;

            return (
              <Card 
                key={plan.id} 
                className={plan.highlighted ? "border-primary shadow-lg relative" : ""}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge variant="default" className="px-4 py-1">
                      Mais popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        R$ {price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingCycle === "monthly" ? "mês" : "ano"}
                      </span>
                    </div>
                    
                    {billingCycle === "annual" && !plan.isFree && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          R$ {getMonthlyEquivalent(plan.annualPrice).replace('.', ',')} /mês
                        </p>
                        {savings > 0 && (
                          <Badge variant="outline" className="mt-1">
                            Economize {savings}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id 
                      ? "Processando..." 
                      : plan.isFree 
                        ? "Começar grátis" 
                        : "Assinar agora"
                    }
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Compare os planos</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Recursos</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center p-4 font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFeatures.map((feature, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{feature.name}</td>
                    {feature.values.map((value, planIdx) => (
                      <td key={planIdx} className="text-center p-4">
                        {value === "✓" ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : value === "✗" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
