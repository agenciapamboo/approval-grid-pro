import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRevenueTaxes } from "@/hooks/useRevenueTaxes";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
import { Plus, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";
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

export const RevenueTaxesManager = () => {
  const { taxes, loading, totalTaxRate, calculateTaxAmount, updateTax, addCustomTax, deleteTax } = useRevenueTaxes();
  const { metrics } = useFinancialMetrics();
  
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const handleUpdateTax = async (id: string) => {
    const rate = parseFloat(editingValues[id] || "0");
    await updateTax(id, rate);
    setEditingValues((prev) => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const handleAddTax = async () => {
    if (!newTaxName.trim() || !newTaxRate) return;
    
    const rate = parseFloat(newTaxRate);
    if (rate < 0 || rate > 100) {
      toast.error("Taxa deve estar entre 0% e 100%");
      return;
    }
    
    await addCustomTax(newTaxName, rate, 'gross_revenue', "Customizada");
    setNewTaxName("");
    setNewTaxRate("");
  };

  const grossRevenue = metrics?.currentMRR || 0;
  const totalTaxAmount = calculateTaxAmount(grossRevenue);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse text-muted-foreground">
            Carregando taxas...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Taxas sobre Receita
        </CardTitle>
        <CardDescription>
          Configure taxas percentuais que incidem sobre a receita bruta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo de Taxas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div>
            <p className="text-xs text-muted-foreground">Taxa Total (%)</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">
              {totalTaxRate.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita Bruta</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {grossRevenue.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor das Taxas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              R$ {totalTaxAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Taxas Fixas */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge variant="outline">Taxas Fixas</Badge>
          </h3>
          <div className="space-y-2">
            {taxes.filter(t => t.is_fixed).map((tax) => (
              <div key={tax.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                <Label className="flex-1 font-medium">{tax.tax_name}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-24"
                    value={editingValues[tax.id] ?? tax.tax_rate}
                    onChange={(e) => setEditingValues((prev) => ({
                      ...prev,
                      [tax.id]: e.target.value,
                    }))}
                    onBlur={() => handleUpdateTax(tax.id)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Badge variant="outline" className="ml-2">
                    R$ {(grossRevenue * (parseFloat(editingValues[tax.id] ?? tax.tax_rate.toString()) / 100)).toFixed(2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Taxas Customizadas */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Badge>Taxas Customizadas</Badge>
          </h3>
          <div className="space-y-2">
            {taxes.filter(t => !t.is_fixed).map((tax) => (
              <div key={tax.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Label className="flex-1 font-medium">{tax.tax_name}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-24"
                    value={editingValues[tax.id] ?? tax.tax_rate}
                    onChange={(e) => setEditingValues((prev) => ({
                      ...prev,
                      [tax.id]: e.target.value,
                    }))}
                    onBlur={() => handleUpdateTax(tax.id)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Badge variant="outline" className="ml-2">
                    R$ {(grossRevenue * (parseFloat(editingValues[tax.id] ?? tax.tax_rate.toString()) / 100)).toFixed(2)}
                  </Badge>
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
                          Tem certeza que deseja remover "{tax.tax_name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTax(tax.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {/* Adicionar Nova Taxa */}
            <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg">
              <Input
                placeholder="Nome da taxa"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button onClick={handleAddTax} disabled={!newTaxName.trim() || !newTaxRate}>
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
