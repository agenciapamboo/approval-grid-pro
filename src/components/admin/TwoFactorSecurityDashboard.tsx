import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, Shield, ShieldAlert, TrendingUp, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardStats {
  totalAttempts: number;
  failedAttempts: number;
  blockedIPs: number;
  alertsSent: number;
  successRate: number;
}

interface TimeSeriesData {
  time: string;
  failed: number;
  success: number;
}

interface BlockedIP {
  ip_address: string;
  blocked_until: string;
  failed_attempts: number;
  last_attempt: string;
}

interface RecentAlert {
  id: string;
  alert_type: string;
  ip_address: string;
  notified_at: string;
  details: any;
}

const COLORS = {
  danger: 'hsl(var(--destructive))',
  warning: 'hsl(var(--warning))',
  success: 'hsl(var(--success))',
  primary: 'hsl(var(--primary))',
};

interface TwoFactorSecurityDashboardProps {
  agencyId?: string;
}

export function TwoFactorSecurityDashboard({ agencyId }: TwoFactorSecurityDashboardProps = {}) {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalAttempts: 0,
    failedAttempts: 0,
    blockedIPs: 0,
    alertsSent: 0,
    successRate: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Calcular intervalo de tempo
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Estatísticas gerais - filtrar por agência se fornecido
      let attemptsQuery = supabase
        .from('token_validation_attempts')
        .select(`
          success, 
          attempted_at,
          two_factor_codes!inner(
            client_id,
            clients!inner(agency_id)
          )
        `)
        .gte('attempted_at', startDate.toISOString());

      if (agencyId) {
        attemptsQuery = attemptsQuery.eq('two_factor_codes.clients.agency_id', agencyId);
      }

      const { data: attempts } = await attemptsQuery;

      const totalAttempts = attempts?.length || 0;
      const failedAttempts = attempts?.filter(a => !a.success).length || 0;
      const successAttempts = totalAttempts - failedAttempts;
      const successRate = totalAttempts > 0 ? (successAttempts / totalAttempts) * 100 : 0;

      // IPs bloqueados atualmente - filtrar por agência se fornecido
      let blockedQuery = supabase
        .from('token_validation_attempts')
        .select(`
          ip_address, 
          blocked_until, 
          attempted_at,
          two_factor_codes!inner(
            client_id,
            clients!inner(agency_id)
          )
        `)
        .not('blocked_until', 'is', null)
        .gte('blocked_until', now.toISOString())
        .order('blocked_until', { ascending: false });

      if (agencyId) {
        blockedQuery = blockedQuery.eq('two_factor_codes.clients.agency_id', agencyId);
      }

      const { data: blocked } = await blockedQuery;

      // Agrupar por IP
      const blockedMap = new Map<string, BlockedIP>();
      blocked?.forEach(item => {
        const existing = blockedMap.get(item.ip_address);
        if (!existing || new Date(item.blocked_until) > new Date(existing.blocked_until)) {
          blockedMap.set(item.ip_address, {
            ip_address: item.ip_address,
            blocked_until: item.blocked_until,
            failed_attempts: (existing?.failed_attempts || 0) + 1,
            last_attempt: item.attempted_at,
          });
        }
      });

      setBlockedIPs(Array.from(blockedMap.values()));

      // Alertas recentes - sem filtro por agência pois a tabela não tem relação direta
      // Em produção, seria melhor adicionar agency_id ou filtrar via IP
      const { data: alerts } = await supabase
        .from('security_alerts_sent')
        .select('*')
        .gte('notified_at', startDate.toISOString())
        .order('notified_at', { ascending: false })
        .limit(10);

      setRecentAlerts(alerts || []);

      // Dados de série temporal (agrupados por hora)
      const timeSeriesMap = new Map<string, { failed: number; success: number }>();
      
      attempts?.forEach(attempt => {
        const hour = format(new Date(attempt.attempted_at), 'HH:00', { locale: ptBR });
        const current = timeSeriesMap.get(hour) || { failed: 0, success: 0 };
        
        if (attempt.success) {
          current.success++;
        } else {
          current.failed++;
        }
        
        timeSeriesMap.set(hour, current);
      });

      const timeSeriesArray = Array.from(timeSeriesMap.entries())
        .map(([time, data]) => ({ time, ...data }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setTimeSeriesData(timeSeriesArray);

      // Atualizar estatísticas
      setStats({
        totalAttempts,
        failedAttempts,
        blockedIPs: blockedMap.size,
        alertsSent: alerts?.length || 0,
        successRate,
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Configurar realtime para atualizações automáticas
    const channel = supabase
      .channel('security_dashboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_validation_attempts'
        },
        () => {
          console.log('Nova tentativa detectada, atualizando dashboard...');
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_alerts_sent'
        },
        () => {
          console.log('Novo alerta detectado, atualizando dashboard...');
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const getAlertTypeName = (type: string) => {
    const types: Record<string, string> = {
      'warning_failures': 'Aviso - 3+ tentativas',
      'critical_failures': 'Crítico - 5+ tentativas',
      'permanent_block': 'Bloqueio Permanente - 10+ tentativas',
    };
    return types[type] || type;
  };

  const pieData = [
    { name: 'Sucesso', value: stats.totalAttempts - stats.failedAttempts, color: COLORS.success },
    { name: 'Falha', value: stats.failedAttempts, color: COLORS.danger },
  ];

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Segurança 2FA</h2>
          <p className="text-muted-foreground mt-1">
            Monitoramento em tempo real de tentativas de acesso e alertas de segurança
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tentativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentativas Falhadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failedAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalAttempts > 0 ? ((stats.failedAttempts / stats.totalAttempts) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloqueados</CardTitle>
            <ShieldAlert className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.blockedIPs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bloqueios ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Enviados</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alertsSent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Notificações disparadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Autenticações bem-sucedidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de linha - Tentativas ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Tentativas ao Longo do Tempo</CardTitle>
            <CardDescription>Distribuição de tentativas por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stackId="1"
                  stroke={COLORS.danger} 
                  fill={COLORS.danger} 
                  name="Falhas"
                />
                <Area 
                  type="monotone" 
                  dataKey="success" 
                  stackId="1"
                  stroke={COLORS.success} 
                  fill={COLORS.success}
                  name="Sucessos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Distribuição sucesso/falha */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Resultados</CardTitle>
            <CardDescription>Proporção de tentativas bem-sucedidas vs. falhadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* IPs Bloqueados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              IPs Bloqueados Atualmente
            </CardTitle>
            <CardDescription>
              {blockedIPs.length} {blockedIPs.length === 1 ? 'IP bloqueado' : 'IPs bloqueados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Bloqueado Até</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum IP bloqueado no momento
                      </TableCell>
                    </TableRow>
                  ) : (
                    blockedIPs.map((ip) => (
                      <TableRow key={ip.ip_address}>
                        <TableCell className="font-mono">{ip.ip_address}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{ip.failed_attempts}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(ip.blocked_until), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Alertas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Alertas Recentes
            </CardTitle>
            <CardDescription>
              Últimos {recentAlerts.length} alertas enviados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Enviado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum alerta enviado no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge 
                            variant={
                              alert.alert_type === 'permanent_block' ? 'destructive' :
                              alert.alert_type === 'critical_failures' ? 'destructive' :
                              'default'
                            }
                          >
                            {getAlertTypeName(alert.alert_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{alert.ip_address}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(alert.notified_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
