import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FinancialMetrics {
  averageTicket: number;
  currentMRR: number;
  projectedMRR: number;
  churnRate: number;
  cancellationsThisMonth: number;
  newClientsThisMonth: number;
  growthRate: number;
  totalActiveSubscriptions: number;
}

export function useFinancialMetrics() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar o snapshot mais recente
      const { data, error: fetchError } = await supabase
        .from('financial_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        // Se não há snapshot, retornar valores zerados
        setMetrics({
          averageTicket: 0,
          currentMRR: 0,
          projectedMRR: 0,
          churnRate: 0,
          cancellationsThisMonth: 0,
          newClientsThisMonth: 0,
          growthRate: 0,
          totalActiveSubscriptions: 0
        });
        return;
      }

      // Calcular growth rate
      const netGrowth = data.projected_new_clients - data.cancellations_this_month;
      const growthRate = data.total_active_subscriptions > 0
        ? (netGrowth / data.total_active_subscriptions) * 100
        : 0;

      setMetrics({
        averageTicket: data.average_ticket_brl || 0,
        currentMRR: (data.total_mrr || 0) / 100, // Converter de centavos para reais
        projectedMRR: (data.projected_mrr_next_month || 0) / 100,
        churnRate: data.churn_rate || 0,
        cancellationsThisMonth: data.cancellations_this_month || 0,
        newClientsThisMonth: data.projected_new_clients || 0,
        growthRate,
        totalActiveSubscriptions: data.total_active_subscriptions || 0
      });
    } catch (err) {
      console.error('Erro ao buscar métricas financeiras:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return { metrics, loading, error, refetch: fetchMetrics };
}
