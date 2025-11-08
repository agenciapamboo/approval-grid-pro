import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAgencyLimits } from "@/hooks/useClientLimits";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AgencyLimitsOverviewProps {
  agencyId: string;
}

export function AgencyLimitsOverview({ agencyId }: AgencyLimitsOverviewProps) {
  const { allMetrics, loading, error } = useAgencyLimits(agencyId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !allMetrics || allMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Uso da Agência</CardTitle>
          <CardDescription>
            {error || 'Nenhuma métrica disponível para esta agência'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular totais
  const totalPostsUsed = allMetrics.reduce((sum, m) => sum + m.postsUsed, 0);
  const totalCreativesUsed = allMetrics.reduce((sum, m) => sum + m.creativesUsed, 0);
  const clientsAtRisk = allMetrics.filter(m => 
    m.postsPercentage >= 90 || m.creativesPercentage >= 90
  ).length;
  const clientsWarning = allMetrics.filter(m => 
    (m.postsPercentage >= 70 && m.postsPercentage < 90) || 
    (m.creativesPercentage >= 70 && m.creativesPercentage < 90)
  ).length;

  // Dados para gráfico
  const chartData = allMetrics
    .map(m => ({
      name: m.clientName.length > 15 ? m.clientName.substring(0, 15) + '...' : m.clientName,
      posts: m.postsPercentage,
      criativos: m.creativesPercentage,
      postsColor: m.postsPercentage >= 90 ? 'hsl(var(--destructive))' : 
                  m.postsPercentage >= 70 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
      creativesColor: m.creativesPercentage >= 90 ? 'hsl(var(--destructive))' : 
                      m.creativesPercentage >= 70 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
    }))
    .sort((a, b) => Math.max(b.posts, b.criativos) - Math.max(a.posts, a.criativos))
    .slice(0, 10); // Top 10 clientes com maior uso

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge variant="destructive">Crítico</Badge>;
    if (percentage >= 70) return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allMetrics.length}</div>
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPostsUsed}</div>
            <p className="text-xs text-muted-foreground">Posts criados este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criativos Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreativesUsed}</div>
            <p className="text-xs text-muted-foreground">Criativos em storage</p>
          </CardContent>
        </Card>

        <Card className={clientsAtRisk > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes em Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{clientsAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              +{clientsWarning} em atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de uso por cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes por Uso de Limites</CardTitle>
          <CardDescription>
            Clientes com maior utilização de posts e criativos (percentual)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} className="text-xs" />
              <YAxis dataKey="name" type="category" width={120} className="text-xs" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any) => `${value}%`}
              />
              <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Posts (%)" />
              <Bar dataKey="criativos" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="Criativos (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Cliente</CardTitle>
          <CardDescription>Uso detalhado de recursos por cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Criativos</TableHead>
                <TableHead>Status Posts</TableHead>
                <TableHead>Status Criativos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMetrics
                .sort((a, b) => Math.max(b.postsPercentage, b.creativesPercentage) - Math.max(a.postsPercentage, a.creativesPercentage))
                .map((metric) => (
                  <TableRow key={metric.clientId}>
                    <TableCell className="font-medium">{metric.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{metric.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {metric.postsUsed}
                          {metric.postsLimit && <span className="text-muted-foreground"> / {metric.postsLimit}</span>}
                        </div>
                        {metric.postsLimit && (
                          <Progress 
                            value={metric.postsPercentage} 
                            className="h-1 w-20"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {metric.creativesUsed}
                          {metric.creativesLimit && <span className="text-muted-foreground"> / {metric.creativesLimit}</span>}
                        </div>
                        {metric.creativesLimit && (
                          <Progress 
                            value={metric.creativesPercentage} 
                            className="h-1 w-20"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {metric.postsLimit ? getStatusBadge(metric.postsPercentage) : <Badge variant="outline" className="bg-secondary text-secondary-foreground">Ilimitado</Badge>}
                    </TableCell>
                    <TableCell>
                      {metric.creativesLimit ? getStatusBadge(metric.creativesPercentage) : <Badge variant="outline" className="bg-secondary text-secondary-foreground">Ilimitado</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
