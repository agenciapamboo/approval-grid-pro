import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientLimits } from "@/hooks/useClientLimits";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { FileText, Image, Users, TrendingUp, AlertTriangle, CheckCircle, Activity } from "lucide-react";

interface ClientLimitsMetricsProps {
  clientId: string;
}

export function ClientLimitsMetrics({ clientId }: ClientLimitsMetricsProps) {
  const { metrics, loading, error } = useClientLimits(clientId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao Carregar Métricas</CardTitle>
          <CardDescription>{error || 'Métricas não disponíveis'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'hsl(var(--destructive))';
    if (percentage >= 70) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (percentage >= 70) return <Activity className="h-4 w-4 text-warning" />;
    return <CheckCircle className="h-4 w-4 text-primary" />;
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge variant="destructive">Crítico</Badge>;
    if (percentage >= 70) return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
    return <Badge variant="default">Normal</Badge>;
  };

  // Dados para gráfico de barras
  const barChartData = [
    {
      name: 'Posts',
      usado: metrics.postsUsed,
      limite: metrics.postsLimit || metrics.postsUsed,
      percentage: metrics.postsPercentage,
    },
    {
      name: 'Criativos',
      usado: metrics.creativesUsed,
      limite: metrics.creativesLimit || metrics.creativesUsed,
      percentage: metrics.creativesPercentage,
    },
  ];

  // Dados para gráfico de pizza
  const pieChartData = [
    { name: 'Posts Usados', value: metrics.postsUsed, color: getProgressColor(metrics.postsPercentage) },
    { name: 'Posts Disponíveis', value: metrics.postsLimit ? metrics.postsLimit - metrics.postsUsed : 0, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header com informações do plano */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Métricas de Uso - {metrics.clientName}
              </CardTitle>
              <CardDescription>
                Plano: <Badge variant="outline" className="ml-2">{metrics.plan}</Badge>
                {metrics.isUnlimited && (
                  <Badge variant="outline" className="ml-2 bg-secondary text-secondary-foreground">Ilimitado</Badge>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Posts Mensais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts Mensais</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {metrics.postsUsed}
                  {metrics.postsLimit && (
                    <span className="text-sm text-muted-foreground font-normal"> / {metrics.postsLimit}</span>
                  )}
                </div>
                {getStatusIcon(metrics.postsPercentage)}
              </div>
              {metrics.postsLimit && (
                <>
                  <Progress 
                    value={metrics.postsPercentage} 
                    className="h-2"
                    style={{
                      ['--progress-background' as any]: getProgressColor(metrics.postsPercentage)
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {metrics.postsPercentage}% utilizado
                    </p>
                    {getStatusBadge(metrics.postsPercentage)}
                  </div>
                </>
              )}
              {!metrics.postsLimit && (
                <Badge variant="outline" className="w-full justify-center bg-secondary text-secondary-foreground">
                  Ilimitado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Criativos Arquivados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criativos em Storage</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {metrics.creativesUsed}
                  {metrics.creativesLimit && (
                    <span className="text-sm text-muted-foreground font-normal"> / {metrics.creativesLimit}</span>
                  )}
                </div>
                {getStatusIcon(metrics.creativesPercentage)}
              </div>
              {metrics.creativesLimit && (
                <>
                  <Progress 
                    value={metrics.creativesPercentage} 
                    className="h-2"
                    style={{
                      ['--progress-background' as any]: getProgressColor(metrics.creativesPercentage)
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {metrics.creativesPercentage}% utilizado
                    </p>
                    {getStatusBadge(metrics.creativesPercentage)}
                  </div>
                </>
              )}
              {!metrics.creativesLimit && (
                <Badge variant="outline" className="w-full justify-center bg-secondary text-secondary-foreground">
                  Ilimitado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        {metrics.teamMembersLimit !== null && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros da Equipe</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  {metrics.teamMembers}
                  {metrics.teamMembersLimit && (
                    <span className="text-sm text-muted-foreground font-normal"> / {metrics.teamMembersLimit}</span>
                  )}
                </div>
                {metrics.teamMembersLimit && (
                  <>
                    <Progress 
                      value={Math.round((metrics.teamMembers / metrics.teamMembersLimit) * 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {Math.round((metrics.teamMembers / metrics.teamMembersLimit) * 100)}% utilizado
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráficos */}
      {!metrics.isUnlimited && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de Barras - Comparativo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso vs Limites</CardTitle>
              <CardDescription>Comparativo de uso atual e limites do plano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="usado" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Usado" />
                  <Bar dataKey="limite" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} name="Limite" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Posts */}
          {metrics.postsLimit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Posts</CardTitle>
                <CardDescription>Proporção de posts usados vs disponíveis</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Alertas e Recomendações */}
      {(metrics.postsPercentage >= 70 || metrics.creativesPercentage >= 70) && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Atenção aos Limites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.postsPercentage >= 70 && (
              <p className="text-sm">
                • Você está usando {metrics.postsPercentage}% do limite de posts mensais. 
                {metrics.postsPercentage >= 90 && ' Considere arquivar conteúdos antigos ou fazer upgrade do plano.'}
              </p>
            )}
            {metrics.creativesPercentage >= 70 && (
              <p className="text-sm">
                • Você está usando {metrics.creativesPercentage}% do limite de armazenamento de criativos. 
                {metrics.creativesPercentage >= 90 && ' Arquive conteúdos antigos para liberar espaço.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
