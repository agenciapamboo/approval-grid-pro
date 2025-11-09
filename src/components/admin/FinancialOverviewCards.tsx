import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";
import { TrendingUp, TrendingDown, DollarSign, Users, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinancialOverviewCards() {
  const { metrics, loading } = useFinancialMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const growthIsPositive = metrics.growthRate >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Ticket Médio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {metrics.averageTicket.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Por cliente pagante
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Receitas/mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas/mês</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            R$ {metrics.currentMRR.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.totalActiveSubscriptions} assinaturas ativas
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Projeção Próximo Mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projeção</CardTitle>
          {growthIsPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            growthIsPositive ? "text-blue-600" : "text-orange-600"
          )}>
            R$ {metrics.projectedMRR.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={growthIsPositive ? "default" : "destructive"} className="text-xs">
              {growthIsPositive ? '+' : ''}{metrics.growthRate.toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground">
              vs mês atual
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Taxa de Churn */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
          <UserMinus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            metrics.churnRate <= 5 ? "text-green-600" :
            metrics.churnRate <= 10 ? "text-yellow-600" : "text-red-600"
          )}>
            {metrics.churnRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.cancellationsThisMonth} cancelamento{metrics.cancellationsThisMonth !== 1 ? 's' : ''} este mês
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
