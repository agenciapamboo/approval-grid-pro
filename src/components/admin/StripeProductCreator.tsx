import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function StripeProductCreator() {
  const queryClient = useQueryClient();
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [annualPrice, setAnnualPrice] = useState("");
  const [currency, setCurrency] = useState("brl");

  const createProductMutation = useMutation({
    mutationFn: async (data: {
      product_name: string;
      product_description: string;
      price_amount: number;
      price_currency: string;
      recurring_interval: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('create-stripe-product', {
        body: data
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success("Produto criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["stripe-products"] });
      queryClient.invalidateQueries({ queryKey: ["stripe-prices"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar produto: ${error.message}`);
    },
  });

  const createAllProductsMutation = useMutation({
    mutationFn: async () => {
      const products = [
        {
          name: "Eugência",
          description: "Plano Eugência",
          monthly: 2970, // R$ 29,70
          annual: 27000, // R$ 270,00
        },
        {
          name: "Agência Social Mídia",
          description: "Plano para agências de Social Mídia",
          monthly: 4950, // R$ 49,50
          annual: 49500, // R$ 495,00
        },
        {
          name: "Agência Full Service",
          description: "Plano completo para agências",
          monthly: 9720, // R$ 97,20
          annual: 97200, // R$ 972,00
        },
      ];

      const results = [];

      // Create all products and prices
      for (const product of products) {
        // Create monthly price
        const monthlyResult = await supabase.functions.invoke('create-stripe-product', {
          body: {
            product_name: product.name,
            product_description: product.description,
            price_amount: product.monthly,
            price_currency: "brl",
            recurring_interval: "month",
          }
        });

        if (monthlyResult.error) throw monthlyResult.error;
        results.push(monthlyResult.data);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create annual price
        const annualResult = await supabase.functions.invoke('create-stripe-product', {
          body: {
            product_name: product.name,
            product_description: product.description,
            price_amount: product.annual,
            price_currency: "brl",
            recurring_interval: "year",
          }
        });

        if (annualResult.error) throw annualResult.error;
        results.push(annualResult.data);

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return results;
    },
    onSuccess: () => {
      toast.success("Todos os produtos foram criados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["stripe-products"] });
      queryClient.invalidateQueries({ queryKey: ["stripe-prices"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar produtos: ${error.message}`);
    },
  });

  const resetForm = () => {
    setProductName("");
    setProductDescription("");
    setMonthlyPrice("");
    setAnnualPrice("");
  };

  const handleCreateProduct = () => {
    if (!productName || !monthlyPrice) {
      toast.error("Preencha pelo menos o nome e o preço mensal");
      return;
    }

    // Create monthly price
    createProductMutation.mutate({
      product_name: productName,
      product_description: productDescription,
      price_amount: Math.round(parseFloat(monthlyPrice) * 100), // Convert to cents
      price_currency: currency,
      recurring_interval: "month",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Criação Rápida
          </CardTitle>
          <CardDescription>
            Crie todos os produtos necessários automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Serão criados:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Eugência - R$ 29,70/mês ou R$ 270,00/ano</li>
                <li>• Agência Social Mídia - R$ 49,50/mês ou R$ 495,00/ano</li>
                <li>• Agência Full Service - R$ 97,20/mês ou R$ 972,00/ano</li>
              </ul>
            </div>
            <Button
              onClick={() => createAllProductsMutation.mutate()}
              disabled={createAllProductsMutation.isPending}
              className="w-full"
            >
              {createAllProductsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando produtos...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Criar Todos os Produtos Automaticamente
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Produto Individual
          </CardTitle>
          <CardDescription>
            Crie um produto e seus preços manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Nome do Produto</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Plano Premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Descrição</Label>
              <Textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Descrição do produto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Preço Mensal (R$)</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  step="0.01"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder="29.70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualPrice">Preço Anual (R$)</Label>
                <Input
                  id="annualPrice"
                  type="number"
                  step="0.01"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  placeholder="270.00"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Preço anual deve ser criado separadamente
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brl">BRL (Real Brasileiro)</SelectItem>
                  <SelectItem value="usd">USD (Dólar Americano)</SelectItem>
                  <SelectItem value="eur">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateProduct}
              disabled={createProductMutation.isPending}
              className="w-full"
            >
              {createProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Produto
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
