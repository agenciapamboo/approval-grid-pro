import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanInfoCardProps {
  clientId: string;
}

export function PlanInfoCard({ clientId }: PlanInfoCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracted, setContracted] = useState(0);
  const [currentMonthCount, setCurrentMonthCount] = useState(0);
  const [monthlyHistory, setMonthlyHistory] = useState<{ month: string; count: number }[]>([]);
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    loadPlanData();
  }, [clientId]);

  const loadPlanData = async () => {
    try {
      // Buscar dados do cliente
      const { data: client } = await supabase
        .from('clients')
        .select('monthly_creatives, show_overage_message, overage_message_template, agency_id')
        .eq('id', clientId)
        .single();

      if (client) {
        setClientData(client);
        setContracted(client.monthly_creatives || 0);
      }

      // Contar criativos do mês atual
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { count: currentCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      setCurrentMonthCount(currentCount || 0);

      // Histórico dos últimos 6 meses (excluindo o atual)
      const history: { month: string; count: number }[] = [];
      for (let i = 1; i <= 6; i++) {
        const targetDate = subMonths(now, i);
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);

        const { count } = await supabase
          .from('contents')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (count && count > 0) {
          history.push({
            month: format(targetDate, 'yyyy-MM'),
            count: count,
          });
        }
      }

      setMonthlyHistory(history);
    } catch (error) {
      console.error('Erro ao carregar dados do plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const excedente = currentMonthCount - contracted;
  const hasOverage = excedente > 0;

  const getContactType = () => {
    // Se tem agency_id, falar com agência, senão com creator
    return clientData?.agency_id ? 'agência' : 'creator';
  };

  const getOverageMessage = () => {
    if (!clientData?.overage_message_template) {
      return `Fale com sua ${getContactType()} para regularizar sua situação.`;
    }
    return clientData.overage_message_template.replace('{contact_type}', getContactType());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informações do Plano</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Informações do Plano
        </CardTitle>
        <CardDescription>Acompanhe seu consumo mensal de criativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criativos Contratados */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Criativos contratados</p>
            <p className="text-2xl font-bold">{contracted}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Criados em {format(new Date(), 'MMMM', { locale: ptBR })}</p>
            <p className="text-2xl font-bold">{currentMonthCount}</p>
          </div>
        </div>

        {/* Excedente */}
        {hasOverage && clientData?.show_overage_message && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Excedente: {excedente} criativos.</strong>
              <br />
              {getOverageMessage()}
            </AlertDescription>
          </Alert>
        )}

        {/* Histórico de meses anteriores */}
        {monthlyHistory.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Histórico de meses anteriores
            </div>
            <div className="space-y-2">
              {monthlyHistory.map((item) => (
                <Button
                  key={item.month}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate(`/client/${clientId}/history?month=${item.month}`)}
                >
                  <span>{format(new Date(item.month), 'MMMM yyyy', { locale: ptBR })}</span>
                  <Badge variant="outline">{item.count} criativos</Badge>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
