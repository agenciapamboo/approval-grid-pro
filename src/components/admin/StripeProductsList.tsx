import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";

interface StripeProductsListProps {
  products: any[];
  prices: any[];
}

export function StripeProductsList({ products, prices }: StripeProductsListProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const isPriceConfigured = (lookupKey: string) => {
    const plans = ["eugencia", "socialmidia", "fullservice"] as const;
    return plans.some(plan => {
      const config = STRIPE_PRODUCTS[plan];
      if (!('prices' in config)) return false;
      return (
        config.prices?.monthly?.lookup_key === lookupKey ||
        config.prices?.annual?.lookup_key === lookupKey
      );
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos e Preços do Stripe</CardTitle>
        <CardDescription>
          Todos os produtos e preços configurados na sua conta Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum produto encontrado no Stripe
          </div>
        ) : (
          <div className="space-y-6">
            {products.map((product) => {
              const productPrices = prices.filter((p) => p.product === product.id);
              
              return (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {product.id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(product.id, "Product ID")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Badge variant={product.active ? "success" : "outline"}>
                          {product.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://dashboard.stripe.com/products/${product.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver no Stripe
                    </Button>
                  </div>

                  {productPrices.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-3">Preços</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Valor</TableHead>
                            <TableHead>Intervalo</TableHead>
                            <TableHead>Lookup Key</TableHead>
                            <TableHead>Price ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productPrices.map((price) => {
                            const isConfigured = isPriceConfigured(price.lookup_key);
                            
                            return (
                              <TableRow key={price.id}>
                                <TableCell className="font-medium">
                                  {formatCurrency(price.unit_amount, price.currency)}
                                </TableCell>
                                <TableCell>
                                  {price.recurring?.interval === 'month' ? 'Mensal' : 'Anual'}
                                </TableCell>
                                <TableCell>
                                  {price.lookup_key ? (
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {price.lookup_key}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {price.id}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(price.id, "Price ID")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isConfigured ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle className="h-4 w-4" />
                                      <span className="text-xs">Configurado</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <XCircle className="h-4 w-4" />
                                      <span className="text-xs">Não configurado</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`https://dashboard.stripe.com/prices/${price.id}`, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
