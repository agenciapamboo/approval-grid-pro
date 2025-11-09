import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, TrendingUp } from "lucide-react";
import { useNewClientsStats } from "@/hooks/useNewClientsStats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const NewClientsAlert = () => {
  const { stats, loading } = useNewClientsStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse text-muted-foreground">
            Carregando avisos...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTitle = () => {
    if (stats.displayMode === 'day') {
      return `${stats.totalToday} novo${stats.totalToday > 1 ? 's' : ''} cliente${stats.totalToday > 1 ? 's' : ''} hoje`;
    } else if (stats.displayMode === 'week') {
      return `${stats.totalThisWeek} novo${stats.totalThisWeek > 1 ? 's' : ''} cliente${stats.totalThisWeek > 1 ? 's' : ''} esta semana`;
    } else {
      return `${stats.totalThisMonth} novo${stats.totalThisMonth > 1 ? 's' : ''} cliente${stats.totalThisMonth > 1 ? 's' : ''} este mês`;
    }
  };

  const getVariant = (): "default" | "destructive" | "outline" | "pending" | "success" | "warning" => {
    if (stats.displayMode === 'day') return 'success';
    if (stats.displayMode === 'week') return 'warning';
    return 'outline';
  };

  if (stats.totalThisMonth === 0) {
    return null; // Não exibir se não houver novos clientes
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novos Clientes
          </CardTitle>
          <Badge variant={getVariant()} className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {getTitle()}
          </Badge>
        </div>
        <CardDescription>
          {stats.displayMode === 'day' && 'Clientes cadastrados nas últimas 24 horas'}
          {stats.displayMode === 'week' && 'Clientes cadastrados nos últimos 7 dias'}
          {stats.displayMode === 'month' && 'Clientes cadastrados neste mês'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stats.recentClients.map((client) => (
            <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{client.name}</p>
                {client.agency_name && (
                  <p className="text-xs text-muted-foreground">Agência: {client.agency_name}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(client.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
