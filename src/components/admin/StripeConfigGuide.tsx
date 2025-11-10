import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";

interface StripeConfigGuideProps {
  products: any[];
  prices: any[];
  isFullyConfigured: boolean;
}

export function StripeConfigGuide({ products, prices, isFullyConfigured }: StripeConfigGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "Criar Produtos no Stripe",
      description: "Configure os 3 produtos necessários (Eugência, Social Mídia, Full Service)",
      completed: products.length >= 3,
    },
    {
      id: 2,
      title: "Copiar Price IDs",
      description: "Copie os price_ids de cada preço (mensal e anual) para usar no código",
      completed: prices.length >= 6,
    },
    {
      id: 3,
      title: "Validar Integração",
      description: "Teste se a integração está funcionando corretamente",
      completed: isFullyConfigured,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getPriceIdsByProduct = (productId: string) => {
    return prices.filter(p => p.product === productId);
  };

  const requiredProducts = [
    {
      key: "eugencia",
      name: "Eugência",
      monthlyAmount: 2970,
      annualAmount: 27000,
    },
    {
      key: "socialmidia",
      name: "Agência Social Mídia",
      monthlyAmount: 4950,
      annualAmount: 49500,
    },
    {
      key: "fullservice",
      name: "Agência Full Service",
      monthlyAmount: 9720,
      annualAmount: 97200,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso da Configuração</CardTitle>
          <CardDescription>
            {completedSteps === steps.length
              ? "Configuração completa! Sua integração está pronta."
              : `${completedSteps} de ${steps.length} etapas concluídas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? 'text-green-600' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {step.completed && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Completo
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Create Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {steps[0].completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
                Etapa 1: Criar Produtos
              </CardTitle>
              <CardDescription>
                Crie os produtos necessários no Stripe
              </CardDescription>
            </div>
            {steps[0].completed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                ✓ Completo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!steps[0].completed ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Produtos Pendentes</AlertTitle>
              <AlertDescription>
                Use a aba "Produtos" para criar os 3 produtos necessários automaticamente.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Todos os produtos foram criados com sucesso!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Copy Price IDs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {steps[1].completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
                Etapa 2: Copiar Price IDs
              </CardTitle>
              <CardDescription>
                Copie os price_ids para atualizar no código
              </CardDescription>
            </div>
            {steps[1].completed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                ✓ Completo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aguardando Produtos</AlertTitle>
              <AlertDescription>
                Complete a Etapa 1 primeiro para poder copiar os price_ids.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {requiredProducts.map((reqProduct) => {
                const stripeProduct = products.find(p => p.name === reqProduct.name);
                if (!stripeProduct) return null;

                const productPrices = getPriceIdsByProduct(stripeProduct.id);
                const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month');
                const annualPrice = productPrices.find(p => p.recurring?.interval === 'year');

                return (
                  <div key={reqProduct.key} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{reqProduct.name}</h4>
                    <div className="space-y-2">
                      {monthlyPrice && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-20">Mensal:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {monthlyPrice.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(monthlyPrice.id, "Price ID Mensal")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {annualPrice && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-20">Anual:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {annualPrice.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(annualPrice.id, "Price ID Anual")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Onde colar os Price IDs?</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>Você precisa atualizar os price_ids em 3 arquivos:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code>src/lib/stripe-config.ts</code></li>
                    <li><code>supabase/functions/create-checkout/index.ts</code></li>
                    <li><code>supabase/functions/admin-change-plan/index.ts</code></li>
                  </ul>
                  <p className="text-sm mt-2">
                    Substitua os valores temporários pelos IDs copiados acima.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Test Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {steps[2].completed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
                Etapa 3: Validar Integração
              </CardTitle>
              <CardDescription>
                Teste se tudo está funcionando
              </CardDescription>
            </div>
            {steps[2].completed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                ✓ Completo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isFullyConfigured ? (
            <div className="space-y-4">
              <div className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Integração validada com sucesso!
              </div>
              <Button
                variant="outline"
                onClick={() => window.open('/pricing', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Testar Página de Preços
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Validação Pendente</AlertTitle>
              <AlertDescription>
                Complete as etapas anteriores e atualize os price_ids no código para validar a integração.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
