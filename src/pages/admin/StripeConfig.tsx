import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { StripeProductsList } from "@/components/admin/StripeProductsList";
import { StripeProductCreator } from "@/components/admin/StripeProductCreator";
import { StripeConfigGuide } from "@/components/admin/StripeConfigGuide";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function StripeConfig() {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  // Fetch products from Stripe using edge function
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-stripe-products', {
        body: { limit: 20 }
      });
      
      if (error) throw error;
      return data?.products || [];
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Fetch prices from Stripe using edge function
  const { data: pricesData, isLoading: loadingPrices, refetch: refetchPrices } = useQuery({
    queryKey: ["stripe-prices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-stripe-prices', {
        body: { limit: 50 }
      });
      
      if (error) throw error;
      return data?.prices || [];
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const handleRefresh = async () => {
    toast.info("Atualizando dados do Stripe...");
    await Promise.all([refetchProducts(), refetchPrices()]);
    toast.success("Dados atualizados com sucesso!");
  };

  const stripeProducts = productsData || [];
  const stripePrices = pricesData || [];

  // Calculate configuration status
  const requiredProducts = ["eugencia", "socialmidia", "fullservice"];
  const configuredProducts = stripeProducts.filter((p: any) => 
    requiredProducts.some(rp => {
      const config = STRIPE_PRODUCTS[rp as keyof typeof STRIPE_PRODUCTS];
      return 'id' in config && config.id === p.id;
    })
  );

  const totalRequiredPrices = 6; // 3 products × 2 intervals (monthly + annual)
  const configuredPrices = stripePrices.filter((price: any) => {
    return requiredProducts.some(rp => {
      const config = STRIPE_PRODUCTS[rp as keyof typeof STRIPE_PRODUCTS];
      if (!('prices' in config)) return false;
      return (
        config.prices?.monthly?.lookup_key === price.lookup_key ||
        config.prices?.annual?.lookup_key === price.lookup_key
      );
    });
  });

  const isFullyConfigured = configuredProducts.length === 3 && configuredPrices.length === 6;
  const isPartiallyConfigured = configuredProducts.length > 0 || configuredPrices.length > 0;

  const loading = loadingProducts || loadingPrices;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Configuração do Stripe
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie produtos, preços e validações da integração com Stripe
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status da Configuração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {isFullyConfigured ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">Completo</span>
                    </>
                  ) : isPartiallyConfigured ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-600">Parcial</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-2xl font-bold text-red-600">Pendente</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Produtos Configurados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {`${configuredProducts.length}/3`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Eugência, Social Mídia, Full Service
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Preços Configurados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {`${configuredPrices.length}/${totalRequiredPrices}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mensal e Anual para cada produto
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alert for missing configuration */}
          {!isFullyConfigured && (
            <Alert className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuração Incompleta</AlertTitle>
              <AlertDescription>
                {configuredProducts.length === 0 && configuredPrices.length === 0 ? (
                  <>
                    Você ainda não criou os produtos e preços necessários no Stripe. Use a aba{" "}
                    <strong>"Guia de Configuração"</strong> para começar.
                  </>
                ) : (
                  <>
                    Alguns produtos ou preços estão faltando. Verifique a aba{" "}
                    <strong>"Produtos"</strong> para mais detalhes.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="guide">Guia de Configuração</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo da Integração</CardTitle>
                    <CardDescription>
                      Status atual da integração com o Stripe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        {isFullyConfigured ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">Produtos do Stripe</p>
                          <p className="text-sm text-muted-foreground">
                            {configuredProducts.length === 3
                              ? "Todos os 3 produtos estão criados e configurados"
                              : `${configuredProducts.length} de 3 produtos configurados`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        {configuredPrices.length === 6 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">Preços Configurados</p>
                          <p className="text-sm text-muted-foreground">
                            {configuredPrices.length === 6
                              ? "Todos os 6 preços (mensal e anual) estão configurados"
                              : `${configuredPrices.length} de 6 preços configurados`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        {isFullyConfigured ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">Integração com Código</p>
                          <p className="text-sm text-muted-foreground">
                            {isFullyConfigured
                              ? "Todos os price_ids estão sincronizados com o código"
                              : "Alguns price_ids precisam ser atualizados no código"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {stripeProducts.length > 0 && (
                  <StripeProductsList products={stripeProducts} prices={stripePrices} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <div className="space-y-6">
                <StripeProductCreator />
                {stripeProducts.length > 0 && (
                  <StripeProductsList products={stripeProducts} prices={stripePrices} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="guide" className="mt-6">
              <StripeConfigGuide
                products={stripeProducts}
                prices={stripePrices}
                isFullyConfigured={isFullyConfigured}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
