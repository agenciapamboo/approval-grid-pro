import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Database, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface UsageStats {
  feature: string;
  total_uses: number;
  paid_uses: number;
  total_cost: number;
}

interface TopClient {
  client_name: string;
  total_uses: number;
  paid_uses: number;
  cost: number;
}

interface TimelineData {
  date: string;
  cache: number;
  paid: number;
}

export function AICostDashboard() {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [cacheRate, setCacheRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Query direta: Uso por feature (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logsData } = await supabase
        .from('ai_usage_logs')
        .select('feature, cost_usd, from_cache, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (logsData) {
        // Agregar por feature
        const featureMap: Record<string, UsageStats> = {};
        logsData.forEach((log: any) => {
          if (!featureMap[log.feature]) {
            featureMap[log.feature] = {
              feature: log.feature,
              total_uses: 0,
              paid_uses: 0,
              total_cost: 0
            };
          }
          featureMap[log.feature].total_uses++;
          if (!log.from_cache) {
            featureMap[log.feature].paid_uses++;
            featureMap[log.feature].total_cost += log.cost_usd || 0;
          }
        });

        const aggregatedStats = Object.values(featureMap);
        setStats(aggregatedStats);

        const total = aggregatedStats.reduce((sum, item) => sum + item.total_cost, 0);
        setTotalCost(total);

        const totalUses = aggregatedStats.reduce((sum, item) => sum + item.total_uses, 0);
        const cacheUses = aggregatedStats.reduce((sum, item) => sum + (item.total_uses - item.paid_uses), 0);
        setCacheRate(totalUses > 0 ? (cacheUses / totalUses) * 100 : 0);
      }

      // Top clientes (query direta)
      const { data: clientLogsData } = await supabase
        .from('ai_usage_logs')
        .select(`
          cost_usd,
          from_cache,
          clients!inner(name)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (clientLogsData) {
        const clientMap: Record<string, TopClient> = {};
        clientLogsData.forEach((log: any) => {
          const clientName = log.clients?.name || 'Desconhecido';
          if (!clientMap[clientName]) {
            clientMap[clientName] = {
              client_name: clientName,
              total_uses: 0,
              paid_uses: 0,
              cost: 0
            };
          }
          clientMap[clientName].total_uses++;
          if (!log.from_cache) {
            clientMap[clientName].paid_uses++;
            clientMap[clientName].cost += log.cost_usd || 0;
          }
        });

        const sortedClients = Object.values(clientMap)
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 5);
        setTopClients(sortedClients);
      }

      // Timeline (query direta agregada por dia)
      const { data: timelineLogsData } = await supabase
        .from('ai_usage_logs')
        .select('created_at, from_cache')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (timelineLogsData) {
        const dayMap: Record<string, TimelineData> = {};
        timelineLogsData.forEach((log: any) => {
          const date = new Date(log.created_at).toISOString().split('T')[0];
          if (!dayMap[date]) {
            dayMap[date] = { date, cache: 0, paid: 0 };
          }
          if (log.from_cache) {
            dayMap[date].cache++;
          } else {
            dayMap[date].paid++;
          }
        });
        setTimeline(Object.values(dayMap));
      }

    } catch (error) {
      console.error('Erro ao carregar dados de custo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      'briefing': 'Briefing',
      'caption': 'Legendas',
      'image_analysis': 'Análise de Imagem',
      'audio': 'Transcrição de Áudio',
      'suggestions': 'Sugestões de Conteúdo',
      'monthly_editorial': 'Linha Editorial',
    };
    return labels[feature] || feature;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando dados...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total (30 dias)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Apenas usos pagos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Economia com cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Usos</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((sum, item) => sum + item.total_uses, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.reduce((sum, item) => sum + item.paid_uses, 0)} pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Uso ao Longo do Tempo</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="cache" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Cache" />
              <Area type="monotone" dataKey="paid" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Pago" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela: Uso por Feature */}
      <Card>
        <CardHeader>
          <CardTitle>Uso por Recurso</CardTitle>
          <CardDescription>Detalhamento de custos por feature</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead className="text-right">Total de Usos</TableHead>
                <TableHead className="text-right">Usos Pagos</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.feature}>
                  <TableCell className="font-medium">{getFeatureLabel(stat.feature)}</TableCell>
                  <TableCell className="text-right">{stat.total_uses}</TableCell>
                  <TableCell className="text-right">{stat.paid_uses}</TableCell>
                  <TableCell className="text-right">${(stat.total_cost || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Clientes</CardTitle>
          <CardDescription>Clientes com maior uso de IA</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total de Usos</TableHead>
                <TableHead className="text-right">Usos Pagos</TableHead>
                <TableHead className="text-right">Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.map((client) => (
                <TableRow key={client.client_name}>
                  <TableCell className="font-medium">{client.client_name}</TableCell>
                  <TableCell className="text-right">{client.total_uses}</TableCell>
                  <TableCell className="text-right">{client.paid_uses}</TableCell>
                  <TableCell className="text-right">${(client.cost || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
