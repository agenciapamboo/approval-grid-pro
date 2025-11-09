import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperationalCosts } from "@/hooks/useOperationalCosts";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
import { useRevenueTaxes } from "@/hooks/useRevenueTaxes";
import { Plus, Trash2, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const OperationalCostsManager = () => {
  const { 
    costs, 
    loading, 
    totalCosts, 
    marketingCosts,
    salesCosts,
    operationalCosts,
    cacCosts,
    updateCost, 
    addCustomCost, 
    deleteCost 
  } = useOperationalCosts();
  const { calculateTaxAmount } = useRevenueTaxes();
  const { metrics } = useFinancialMetrics();
  
  const [newCostName, setNewCostName] = useState("");
  const [newCostValue, setNewCostValue] = useState("");
  const [newCostType, setNewCostType] = useState<'operational' | 'marketing' | 'sales'>('operational');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const handleUpdateCost = async (id: string) => {
    const value = parseFloat(editingValues[id] || "0");
    await updateCost(id, value);
    setEditingValues((prev) => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const handleAddCost = async () => {
    if (!newCostName.trim() || !newCostValue) return;
    
    const value = parseFloat(newCostValue);
    await addCustomCost(newCostName, value, "Customizado", newCostType);
    setNewCostName("");
    setNewCostValue("");
    setNewCostType('operational');
  };

  // Cálculos financeiros corretos
  const grossRevenue = metrics?.currentMRR || 0;
  const taxAmount = calculateTaxAmount(grossRevenue);
  const netRevenue = grossRevenue - taxAmount;
  const netProfit = netRevenue - totalCosts;
  const profitMargin = grossRevenue ? (netProfit / grossRevenue) * 100 : 0;

  // CAC CORRETO: (Marketing + Vendas) / Novos Clientes do Mês
  const cac = metrics?.newClientsThisMonth 
    ? cacCosts / metrics.newClientsThisMonth 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse text-muted-foreground">
            Carregando custos...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gestão de Custos Operacionais
        </CardTitle>
        <CardDescription>
          Configure custos fixos e variáveis para calcular CAC e lucro líquido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Receita Bruta</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {grossRevenue.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxas (%)</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              R$ {taxAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Custos Fixos</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              R$ {totalCosts.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            <p className={cn(
              "text-2xl font-bold",
              netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              R$ {netProfit.toFixed(2)}
              <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="ml-2 text-xs">
                {netProfit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {profitMargin.toFixed(1)}%
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CAC</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {cac.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.newClientsThisMonth || 0} novos este mês
            </p>
          </div>
        </div>

        {/* Custos Fixos */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="outline">Custos Fixos</Badge>
          </h3>
          <div className="space-y-2">
            {costs.filter(c => c.is_fixed).map((cost) => (
              <div key={cost.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Label className="flex-1 font-medium">{cost.cost_name}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32"
                    value={editingValues[cost.id] ?? cost.cost_value}
                    onChange={(e) => setEditingValues((prev) => ({
                      ...prev,
                      [cost.id]: e.target.value,
                    }))}
                    onBlur={() => handleUpdateCost(cost.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custos de Marketing e Vendas (CAC) */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="default">Custos de Aquisição (CAC)</Badge>
            <span className="text-sm text-muted-foreground ml-2">
              Total: R$ {cacCosts.toFixed(2)}
            </span>
          </h3>
          <div className="space-y-2">
            {costs.filter(c => c.cost_type === 'marketing' || c.cost_type === 'sales').map((cost) => (
              <div key={cost.id} className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Label className="flex-1 font-medium">
                  {cost.cost_name}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {cost.cost_type === 'marketing' ? 'Marketing' : 'Vendas'}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32"
                    value={editingValues[cost.id] ?? cost.cost_value}
                    onChange={(e) => setEditingValues((prev) => ({
                      ...prev,
                      [cost.id]: e.target.value,
                    }))}
                    onBlur={() => handleUpdateCost(cost.id)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{cost.cost_name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCost(cost.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {costs.filter(c => c.cost_type === 'marketing' || c.cost_type === 'sales').length === 0 && (
              <p className="text-sm text-muted-foreground italic py-2">
                Nenhum custo de marketing ou vendas cadastrado. Adicione abaixo para calcular o CAC corretamente.
              </p>
            )}
          </div>
        </div>

        {/* Custos Customizados */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge>Custos Operacionais Customizados</Badge>
          </h3>
          <div className="space-y-2">
            {costs.filter(c => !c.is_fixed && (c.cost_type === 'operational' || !c.cost_type)).map((cost) => (
              <div key={cost.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Label className="flex-1 font-medium">{cost.cost_name}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32"
                    value={editingValues[cost.id] ?? cost.cost_value}
                    onChange={(e) => setEditingValues((prev) => ({
                      ...prev,
                      [cost.id]: e.target.value,
                    }))}
                    onBlur={() => handleUpdateCost(cost.id)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{cost.cost_name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCost(cost.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {/* Adicionar Novo Custo */}
            <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg">
              <Input
                placeholder="Nome do custo"
                value={newCostName}
                onChange={(e) => setNewCostName(e.target.value)}
                className="flex-1"
              />
              <Select value={newCostType} onValueChange={(v: any) => setNewCostType(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="marketing">Marketing (CAC)</SelectItem>
                  <SelectItem value="sales">Vendas (CAC)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCostValue}
                  onChange={(e) => setNewCostValue(e.target.value)}
                  className="w-32"
                />
              </div>
              <Button onClick={handleAddCost} disabled={!newCostName.trim() || !newCostValue}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
