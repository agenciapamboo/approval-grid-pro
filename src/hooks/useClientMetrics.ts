import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientMetrics {
  approvalRate: {
    approved: number;
    total: number;
    percentage: number;
  };
  reworkRate: {
    adjustments: number;
    total: number;
    percentage: number;
  };
  rejectionRate: {
    rejected: number;
    total: number;
    percentage: number;
  };
}

export function useClientMetrics(clientId: string | null) {
  const [metrics, setMetrics] = useState<ClientMetrics>({
    approvalRate: { approved: 0, total: 0, percentage: 0 },
    reworkRate: { adjustments: 0, total: 0, percentage: 0 },
    rejectionRate: { rejected: 0, total: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    loadMetrics();
  }, [clientId]);

  async function loadMetrics() {
    try {
      setLoading(true);

      // Total de conteúdos deste cliente
      const { count: totalContents } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      // Aprovados
      const { count: approvedCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'approved');

      const approvalRate = {
        approved: approvedCount || 0,
        total: totalContents || 0,
        percentage: totalContents ? ((approvedCount || 0) / totalContents) * 100 : 0,
      };

      // Ajustes solicitados (comments com is_adjustment_request = true)
      const { data: adjustmentsData } = await supabase
        .from('comments')
        .select('content_id, contents!inner(client_id)')
        .eq('is_adjustment_request', true)
        .eq('contents.client_id', clientId);

      const reworkRate = {
        adjustments: adjustmentsData?.length || 0,
        total: totalContents || 0,
        percentage: totalContents ? ((adjustmentsData?.length || 0) / totalContents) * 100 : 0,
      };

      // Reprovados
      const { count: rejectedCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'changes_requested');

      const rejectionRate = {
        rejected: rejectedCount || 0,
        total: totalContents || 0,
        percentage: totalContents ? ((rejectedCount || 0) / totalContents) * 100 : 0,
      };

      setMetrics({
        approvalRate,
        reworkRate,
        rejectionRate,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas do cliente:', error);
      toast.error('Erro ao carregar métricas do cliente');
    } finally {
      setLoading(false);
    }
  }

  return { metrics, loading, refresh: loadMetrics };
}
