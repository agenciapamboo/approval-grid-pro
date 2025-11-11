import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { STRIPE_PRODUCTS, StripePlan } from "@/lib/stripe-config";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: string;
  } | null;
  lookup_key: string | null;
}

interface StripeProduct {
  id: string;
  name: string;
  active: boolean;
}

interface DiagnosticResult {
  stripeMode: 'test' | 'live';
  products: StripeProduct[];
  prices: StripePrice[];
  missingLookupKeys: string[];
  extraLookupKeys: string[];
  productMatches: Array<{
    plan: string;
    expected_id: string;
    found_id?: string;
    status: 'ok' | 'missing' | 'mismatch';
  }>;
}

export default function StripeDiagnostic() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // Get Stripe products
      const { data: productsData, error: productsError } = await supabase.functions.invoke('list-stripe-products');
      if (productsError) throw productsError;

      // Get Stripe prices
      const { data: pricesData, error: pricesError } = await supabase.functions.invoke('list-stripe-prices');
      if (pricesError) throw pricesError;

      const products: StripeProduct[] = productsData?.products || [];
      const prices: StripePrice[] = pricesData?.prices || [];

      // Determine Stripe mode (test vs live) from first product ID
      const stripeMode: 'test' | 'live' = products.some(p => p.id.includes('_test_')) ? 'test' : 'live';

      // Build expected lookup keys from stripe-config.ts
      const expectedLookupKeys = new Set<string>();
      Object.entries(STRIPE_PRODUCTS).forEach(([_, product]) => {
        if ('prices' in product && product.prices) {
          Object.values(product.prices).forEach(price => {
            if (price.lookup_key) {
              expectedLookupKeys.add(price.lookup_key);
            }
          });
        }
      });

      // Get actual lookup keys from Stripe
      const actualLookupKeys = new Set(
        prices.map(p => p.lookup_key).filter(Boolean) as string[]
      );

      // Find missing and extra lookup keys
      const missingLookupKeys = Array.from(expectedLookupKeys).filter(k => !actualLookupKeys.has(k));
      const extraLookupKeys = Array.from(actualLookupKeys).filter(k => !expectedLookupKeys.has(k));

      // Check product ID matches
      const productMatches = Object.entries(STRIPE_PRODUCTS).map(([plan, config]) => {
        const foundProduct = products.find(p => p.id === config.id);
        return {
          plan,
          expected_id: config.id,
          found_id: foundProduct?.id,
          status: foundProduct ? (foundProduct.id === config.id ? 'ok' : 'mismatch') : 'missing'
        } as const;
      });

      const result: DiagnosticResult = {
        stripeMode,
        products,
        prices,
        missingLookupKeys,
        extraLookupKeys,
        productMatches,
      };

      setDiagnostic(result);

      toast({
        title: "Diagnóstico concluído",
        description: `Encontrados ${products.length} produtos e ${prices.length} preços no Stripe (modo ${stripeMode})`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao executar diagnóstico",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Diagnóstico Stripe</h1>
            <p className="text-muted-foreground">
              Validação de produtos, preços e lookup keys
            </p>
          </div>
          <Button onClick={runDiagnostic} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Executar Diagnóstico
              </>
            )}
          </Button>
        </div>

        {diagnostic && (
          <>
            {/* Stripe Mode Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Modo Stripe ativo: <strong>{diagnostic.stripeMode === 'test' ? 'TEST MODE' : 'LIVE MODE'}</strong>
                {diagnostic.stripeMode === 'test' && (
                  <span className="ml-2 text-orange-600">
                    ⚠️ Em produção, use Live Mode
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Lookup Keys Validation */}
            <Card>
              <CardHeader>
                <CardTitle>Validação de Lookup Keys</CardTitle>
                <CardDescription>
                  Comparação entre stripe-config.ts e Stripe Dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostic.missingLookupKeys.length === 0 && diagnostic.extraLookupKeys.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Todos os lookup keys estão sincronizados!</span>
                  </div>
                ) : (
                  <>
                    {diagnostic.missingLookupKeys.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Lookup keys faltando no Stripe:
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostic.missingLookupKeys.map(key => (
                            <li key={key} className="text-sm font-mono text-red-600">
                              {key}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {diagnostic.extraLookupKeys.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Lookup keys extras no Stripe (não no código):
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostic.extraLookupKeys.map(key => (
                            <li key={key} className="text-sm font-mono text-orange-600">
                              {key}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Lookup keys esperados (stripe-config.ts):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(STRIPE_PRODUCTS).map(([plan, config]) => {
                      if (!('prices' in config) || !config.prices) return null;
                      return (
                        <div key={plan} className="border rounded p-3 space-y-1">
                          <div className="font-medium">{config.name}</div>
                          {Object.entries(config.prices).map(([interval, price]) => (
                            <div key={interval} className="text-sm flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {interval}
                              </Badge>
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                {price.lookup_key}
                              </code>
                              {diagnostic.prices.some(p => p.lookup_key === price.lookup_key) ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product IDs Validation */}
            <Card>
              <CardHeader>
                <CardTitle>Validação de Product IDs</CardTitle>
                <CardDescription>
                  Verificação dos IDs de produtos configurados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnostic.productMatches.map(match => (
                    <div
                      key={match.plan}
                      className="flex items-center justify-between border rounded p-3"
                    >
                      <div>
                        <div className="font-medium">{match.plan}</div>
                        <code className="text-xs text-muted-foreground">{match.expected_id}</code>
                      </div>
                      {match.status === 'ok' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : match.status === 'missing' ? (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Mismatch
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* All Stripe Prices */}
            <Card>
              <CardHeader>
                <CardTitle>Todos os Preços no Stripe</CardTitle>
                <CardDescription>
                  {diagnostic.prices.length} preço(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnostic.prices.map(price => (
                    <div key={price.id} className="border rounded p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono">{price.id}</code>
                        <Badge variant="outline">
                          {price.recurring?.interval || 'one-time'}
                        </Badge>
                      </div>
                      {price.lookup_key && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Lookup key: </span>
                          <code className="bg-muted px-2 py-0.5 rounded">{price.lookup_key}</code>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: price.currency.toUpperCase(),
                        }).format((price.unit_amount || 0) / 100)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!diagnostic && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Executar Diagnóstico" para validar a configuração do Stripe</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
