import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceUsage } from "@/hooks/useResourceUsage";
import { AlertCircle, Database, HardDrive, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

function getProgressColor(percentage: number): string {
  if (percentage >= 95) return "bg-red-500";
  if (percentage >= 85) return "bg-orange-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function calculateOverageCost(overageAmount: number, costPerUnit: number): number {
  return overageAmount * costPerUnit;
}

export function ResourceUsagePanel() {
  const { usage, planConfig, loading, error } = useResourceUsage();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !usage || !planConfig) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar uso de recursos: {error || 'Dados não disponíveis'}
        </AlertDescription>
      </Alert>
    );
  }

  const dbOverage = usage.database.used - usage.database.quota;
  const storageOverage = usage.storage.used - usage.storage.quota;
  const egressOverage = usage.egress.used - usage.egress.quota;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de Recursos</CardTitle>
        <CardDescription>
          Plano: {usage.planName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Database */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <div className="flex justify-between flex-1">
              <span className="text-sm font-medium">Database (PostgreSQL)</span>
              <span className="text-sm text-muted-foreground">
                {usage.database.used.toFixed(0)} MB / {usage.database.quota.toLocaleString()} MB
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Progress 
              value={Math.min(usage.database.percentage, 100)} 
              className={cn("h-2", getProgressColor(usage.database.percentage))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usage.database.percentage.toFixed(1)}% usado</span>
              <span>{usage.database.remaining.toFixed(0)} MB restantes</span>
            </div>
          </div>
          {usage.database.percentage > 100 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ⚠️ Database acima do limite! Over-usage: {(dbOverage / 1024).toFixed(2)} GB
                <br />
                Custo adicional estimado: R$ {calculateOverageCost(
                  dbOverage / 1024,
                  planConfig.database_overage_cost_per_gb_month
                ).toFixed(2)}/mês
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Storage */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div className="flex justify-between flex-1">
              <span className="text-sm font-medium">Storage (Arquivos)</span>
              <span className="text-sm text-muted-foreground">
                {usage.storage.used.toFixed(2)} GB / {usage.storage.quota} GB
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Progress 
              value={Math.min(usage.storage.percentage, 100)} 
              className={cn("h-2", getProgressColor(usage.storage.percentage))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usage.storage.percentage.toFixed(1)}% usado</span>
              <span>{usage.storage.remaining.toFixed(2)} GB restantes</span>
            </div>
          </div>
          {usage.storage.percentage > 100 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ⚠️ Storage acima do limite! Over-usage: {storageOverage.toFixed(2)} GB
                <br />
                Custo adicional estimado: R$ {calculateOverageCost(
                  storageOverage,
                  planConfig.storage_overage_cost_per_gb
                ).toFixed(2)}/mês
              </AlertDescription>
            </Alert>
          )}
          {usage.storage.percentage >= 85 && usage.storage.percentage < 100 && (
            <Alert className="mt-2 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs text-yellow-800">
                ⚠️ Atenção: Storage próximo do limite ({usage.storage.percentage.toFixed(1)}%)
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Bandwidth/Egress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="flex justify-between flex-1">
              <span className="text-sm font-medium">Bandwidth (Este mês)</span>
              <span className="text-sm text-muted-foreground">
                {usage.egress.used.toFixed(2)} GB / {usage.egress.quota} GB
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Progress 
              value={Math.min(usage.egress.percentage, 100)} 
              className={cn("h-2", getProgressColor(usage.egress.percentage))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usage.egress.percentage.toFixed(1)}% usado</span>
              <span>{usage.egress.remaining.toFixed(2)} GB restantes</span>
            </div>
          </div>
          {usage.egress.percentage > 100 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ⚠️ Bandwidth acima do limite! Over-usage: {egressOverage.toFixed(2)} GB
                <br />
                Custo adicional estimado: R$ {calculateOverageCost(
                  egressOverage,
                  planConfig.egress_overage_cost_per_gb
                ).toFixed(2)}/mês
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
