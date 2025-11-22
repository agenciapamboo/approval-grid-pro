import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { STRIPE_PRODUCTS, StripePlan } from "@/lib/stripe-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AccessGate from "@/components/auth/AccessGate";

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
  missingPriceIds: string[];
  extraLookupKeys: string[];
  priceIdMatches: Array<{
    plan: string;
    interval: string;
    expected_price_id: string;
    found_price_id?: string;
    status: 'ok' | 'missing' | 'mismatch';
  }>;
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

      // Get Stripe mode from edge function response (determined by API key)
      const stripeMode: 'test' | 'live' = productsData?.mode || pricesData?.mode || 
        (products.some(p => p.id.includes('_test_')) ? 'test' : 'live');

      // Build expected price IDs from stripe-config.ts (LIVE MODE uses price_id directly)
      const expectedPriceIds = new Set<string>();
      Object.entries(STRIPE_PRODUCTS).forEach(([_, product]) => {
        if ('prices' in product && product.prices) {
          Object.values(product.prices).forEach(price => {
            // Check for price_id (LIVE MODE) or lookup_key (TEST MODE fallback)
            if ('price_id' in price && price.price_id) {
              expectedPriceIds.add(price.price_id);
            } else if ('lookup_key' in price && price.lookup_key) {
              expectedPriceIds.add(price.lookup_key);
            }
          });
        }
      });

      // Get actual price IDs and lookup keys from Stripe
      const actualPriceIds = new Set(prices.map(p => p.id).filter(Boolean) as string[]);
      const actualLookupKeys = new Set(
        prices.map(p => p.lookup_key).filter(Boolean) as string[]
      );
      
      // Combine both sets for comparison
      const actualIdentifiers = new Set([...actualPriceIds, ...actualLookupKeys]);

      // Find missing and extra identifiers
      // Missing: expected price_ids not found in Stripe
      const missingPriceIds = Array.from(expectedPriceIds).filter(id => {
        // Check if it's a price_id (starts with price_) and exists in actualPriceIds
        // Or if it's a lookup_key and exists in actualLookupKeys
        if (id.startsWith('price_')) {
          return !actualPriceIds.has(id);
        } else {
          return !actualLookupKeys.has(id);
        }
      });
      // Extra: found in Stripe but not in config (lookup_keys only, as price_ids are validated by priceIdMatches)
      // Only report lookup_keys that aren't expected price_ids
      const extraLookupKeys = Array.from(actualLookupKeys).filter(k => !expectedPriceIds.has(k));

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

      // Check price ID matches
      const priceIdMatches: DiagnosticResult['priceIdMatches'] = [];
      Object.entries(STRIPE_PRODUCTS).forEach(([plan, product]) => {
        if ('prices' in product && product.prices) {
          Object.entries(product.prices).forEach(([interval, priceConfig]) => {
            // LIVE MODE uses price_id directly, TEST MODE uses lookup_key
            const expectedPriceId = ('price_id' in priceConfig ? priceConfig.price_id : null) ||
                                   ('lookup_key' in priceConfig ? priceConfig.lookup_key : null);
            
            if (!expectedPriceId) return;
            
            // Try to find by price_id first (LIVE MODE), then by lookup_key (TEST MODE fallback)
            let foundPrice: StripePrice | undefined;
            if (expectedPriceId.startsWith('price_')) {
              // LIVE MODE: search by price.id
              foundPrice = prices.find(p => p.id === expectedPriceId);
            } else {
              // TEST MODE: search by lookup_key
              foundPrice = prices.find(p => p.lookup_key === expectedPriceId);
            }
            
            // Determine status
            let status: 'ok' | 'missing' | 'mismatch' = 'missing';
            if (foundPrice) {
              if (expectedPriceId.startsWith('price_')) {
                // LIVE MODE: compare price_id directly
                status = foundPrice.id === expectedPriceId ? 'ok' : 'mismatch';
              } else {
                // TEST MODE: compare lookup_key
                status = foundPrice.lookup_key === expectedPriceId ? 'ok' : 'mismatch';
              }
            }
            
            priceIdMatches.push({
              plan,
              interval,
              expected_price_id: expectedPriceId,
              found_price_id: foundPrice?.id,
              status
            });
          });
        }
      });

      const result: DiagnosticResult = {
        stripeMode,
        products,
        prices,
        missingPriceIds,
        extraLookupKeys,
        priceIdMatches,
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
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
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

            {/* Price IDs Validation */}
            <Card>
              <CardHeader>
                <CardTitle>Validação de Price IDs</CardTitle>
                <CardDescription>
                  Comparação entre stripe-config.ts e Stripe Dashboard (LIVE MODE usa price_id diretamente)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostic.missingPriceIds.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Todos os price IDs esperados foram encontrados no Stripe!</span>
                    {diagnostic.extraLookupKeys.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Há {diagnostic.extraLookupKeys.length} lookup key(s) extra(s) no Stripe, mas isso é normal se você ainda tem produtos de TEST MODE)
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    {diagnostic.missingPriceIds.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Price IDs faltando no Stripe:
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostic.missingPriceIds.map(id => (
                            <li key={id} className="text-sm font-mono text-red-600">
                              {id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {diagnostic.extraLookupKeys.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Lookup keys extras no Stripe (não no código - podem ser de TEST MODE):
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {diagnostic.extraLookupKeys.map(key => (
                            <li key={key} className="text-sm font-mono text-orange-600">
                              {key}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          Lookup keys extras são normais se você ainda tem produtos de TEST MODE no Stripe.
                          No LIVE MODE, usamos price_id diretamente.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Price IDs esperados (stripe-config.ts):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(STRIPE_PRODUCTS).map(([plan, config]) => {
                      if (!('prices' in config) || !config.prices) return null;
                      return (
                        <div key={plan} className="border rounded p-3 space-y-1">
                          <div className="font-medium">{config.name}</div>
                          {Object.entries(config.prices).map(([interval, price]) => {
                            const priceId = ('price_id' in price ? price.price_id : null) ||
                                          ('lookup_key' in price ? price.lookup_key : null);
                            if (!priceId) return null;
                            
                            const isPriceId = priceId.startsWith('price_');
                            const match = diagnostic.priceIdMatches.find(
                              m => m.plan === plan && m.interval === interval
                            );
                            
                            return (
                              <div key={interval} className="text-sm flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {interval}
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {priceId}
                                </code>
                                {match?.status === 'ok' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-red-600" />
                                )}
                                {isPriceId && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price ID Matches Detail */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Validação de Price IDs por Plano:</h4>
                  <div className="space-y-2">
                    {diagnostic.priceIdMatches.map(match => (
                      <div
                        key={`${match.plan}-${match.interval}`}
                        className={`flex items-center justify-between border rounded p-3 ${
                          match.status === 'ok' ? 'bg-green-50 border-green-200' : 
                          match.status === 'missing' ? 'bg-red-50 border-red-200' : 
                          'bg-orange-50 border-orange-200'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{match.plan} ({match.interval})</div>
                          <code className="text-xs text-muted-foreground">{match.expected_price_id}</code>
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
        </div>
      </AppLayout>
    </AccessGate>
  );
}
