import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOperationalCosts } from "@/hooks/useOperationalCosts";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
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
  const { costs, loading, totalCosts, updateCost, addCustomCost, deleteCost } = useOperationalCosts();
  const { metrics } = useFinancialMetrics();
  
  const [newCostName, setNewCostName] = useState("");
  const [newCostValue, setNewCostValue] = useState("");
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
    await addCustomCost(newCostName, value, "Customizado");
    setNewCostName("");
    setNewCostValue("");
  };

  const netProfit = (metrics?.currentMRR || 0) - totalCosts;
  const profitMargin = metrics?.currentMRR ? (netProfit / metrics.currentMRR) * 100 : 0;
  const cac = metrics?.totalActiveSubscriptions 
    ? totalCosts / metrics.totalActiveSubscriptions 
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total de Custos</p>
            <p className="text-2xl font-bold text-red-600">
              R$ {totalCosts.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receitas/mês</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {(metrics?.currentMRR || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            <p className={cn(
              "text-2xl font-bold",
              netProfit >= 0 ? "text-green-600" : "text-red-600"
            )}>
              R$ {netProfit.toFixed(2)}
              <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="ml-2 text-xs">
                {netProfit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {profitMargin.toFixed(1)}%
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CAC (Custo por Cliente)</p>
            <p className="text-2xl font-bold text-blue-600">
              R$ {cac.toFixed(2)}
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

        {/* Custos Customizados */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge>Custos Customizados</Badge>
          </h3>
          <div className="space-y-2">
            {costs.filter(c => !c.is_fixed).map((cost) => (
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
