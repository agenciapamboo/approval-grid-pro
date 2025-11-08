import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PlanData {
  planType: string;
  planName: string;
  clientCount: number;
  monthlyRevenue: number; // Em reais
  revenueWeight: number; // Percentual de participação na receita
  totalCost: number; // Custo alocado proporcionalmente
  costPerClient: number;
  profit: number;
  profitPerClient: number;
  profitMargin: number;
}

const PLAN_PRICES: Record<string, number> = {
  creator: 0,
  eugencia: 29.70,
  socialmidia: 49.50,
  fullservice: 97.20,
  unlimited: 0
};

const PLAN_NAMES: Record<string, string> = {
  creator: 'Creator (Grátis)',
  eugencia: 'Eugência',
  socialmidia: 'Social Mídia',
  fullservice: 'Full Service',
  unlimited: 'Sem Plano'
};

export function CostPerClientTable() {
  const [costData, setCostData] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Buscar snapshot financeiro mais recente
      const { data: snapshot } = await supabase
        .from('financial_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!snapshot) {
        setCostData([]);
        return;
      }

      // 2. Buscar custo total de infraestrutura (simulado - você pode buscar do platform_usage_snapshots)
      // Por ora, vamos usar um valor fixo de exemplo
      const TOTAL_INFRASTRUCTURE_COST = 50.00; // R$ 50,00
      setTotalCost(TOTAL_INFRASTRUCTURE_COST);

      // 3. Calcular distribuição de custos proporcionalmente à receita
      const totalMRR = snapshot.total_mrr / 100; // Converter centavos para reais

      const plans = [
        { type: 'creator', count: snapshot.creator_count, mrr: snapshot.creator_mrr / 100 },
        { type: 'eugencia', count: snapshot.eugencia_count, mrr: snapshot.eugencia_mrr / 100 },
        { type: 'socialmidia', count: snapshot.socialmidia_count, mrr: snapshot.socialmidia_mrr / 100 },
        { type: 'fullservice', count: snapshot.fullservice_count, mrr: snapshot.fullservice_mrr / 100 },
        { type: 'unlimited', count: snapshot.unlimited_count, mrr: snapshot.unlimited_mrr / 100 }
      ];

      const planData: PlanData[] = plans.map(plan => {
        const revenueWeight = totalMRR > 0 ? (plan.mrr / totalMRR) * 100 : 0;
        const allocatedCost = (revenueWeight / 100) * TOTAL_INFRASTRUCTURE_COST;
        const costPerClient = plan.count > 0 ? allocatedCost / plan.count : 0;
        const profit = plan.mrr - allocatedCost;
        const profitPerClient = plan.count > 0 ? profit / plan.count : 0;
        const profitMargin = plan.mrr > 0 ? (profit / plan.mrr) * 100 : 0;

        return {
          planType: plan.type,
          planName: PLAN_NAMES[plan.type],
          clientCount: plan.count,
          monthlyRevenue: plan.mrr,
          revenueWeight,
          totalCost: allocatedCost,
          costPerClient,
          profit,
          profitPerClient,
          profitMargin
        };
      });

      setCostData(planData.filter(p => p.clientCount > 0));
    } catch (error) {
      console.error('Erro ao calcular custos por cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalClients = costData.reduce((sum, p) => sum + p.clientCount, 0);
  const totalMRR = costData.reduce((sum, p) => sum + p.monthlyRevenue, 0);
  const totalProfit = totalMRR - totalCost;
  const avgCostPerClient = totalClients > 0 ? totalCost / totalClients : 0;
  const overallMargin = totalMRR > 0 ? (totalProfit / totalMRR) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custo e Receita por Tipo de Cliente</CardTitle>
        <CardDescription>
          Distribuição proporcional baseada na participação na receita (MRR)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">MRR Total</TableHead>
                <TableHead className="text-right">% Receita</TableHead>
                <TableHead className="text-right">Custo Alocado</TableHead>
                <TableHead className="text-right">Custo/Cliente</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costData.map((row) => (
                <TableRow key={row.planType}>
                  <TableCell>
                    <Badge variant="outline">
                      {row.planName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.clientCount}</TableCell>
                  <TableCell className="text-right">
                    R$ {row.monthlyRevenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.revenueWeight.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {row.totalCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {row.costPerClient.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold",
                    row.profit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {row.profit >= 0 ? '+' : ''}R$ {row.profit.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    row.profitMargin >= 80 ? "text-green-600" :
                    row.profitMargin >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {row.profitMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{totalClients}</TableCell>
                <TableCell className="text-right">R$ {totalMRR.toFixed(2)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell className="text-right">R$ {totalCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">R$ {avgCostPerClient.toFixed(2)}</TableCell>
                <TableCell className="text-right text-green-600">
                  +R$ {totalProfit.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {overallMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
