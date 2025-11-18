import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencyMetrics {
  creativesThisMonth: {
    used: number;
    limit: number;
    percentage: number;
  };
  creativesStorage: {
    used: number;
    limit: number;
    percentage: number;
  };
  teamMembers: {
    used: number;
    limit: number;
    percentage: number;
  };
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

export function useAgencyMetrics(agencyId: string | null) {
  const [metrics, setMetrics] = useState<AgencyMetrics>({
    creativesThisMonth: { used: 0, limit: 0, percentage: 0 },
    creativesStorage: { used: 0, limit: 0, percentage: 0 },
    teamMembers: { used: 0, limit: 0, percentage: 0 },
    approvalRate: { approved: 0, total: 0, percentage: 0 },
    reworkRate: { adjustments: 0, total: 0, percentage: 0 },
    rejectionRate: { rejected: 0, total: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    loadMetrics();
  }, [agencyId]);

  async function loadMetrics() {
    try {
      setLoading(true);

      // Buscar dados da agência para obter limites do plano
      const { data: agency } = await supabase
        .from('agencies')
        .select('plan')
        .eq('id', agencyId)
        .single();

      // Buscar entitlements do plano
      const { data: entitlements } = await supabase
        .from('plan_entitlements')
        .select('*')
        .eq('plan', agency?.plan || 'free')
        .single();

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Card 01: Criativos do Mês
      const { count: creativesThisMonthCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

      const creativesLimit = entitlements?.creatives_limit || 0;
      const creativesThisMonth = {
        used: creativesThisMonthCount || 0,
        limit: creativesLimit,
        percentage: creativesLimit > 0 ? ((creativesThisMonthCount || 0) / creativesLimit) * 100 : 0,
      };

      // Card 02: Armazenamento (total de conteúdos)
      const { count: totalContents } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      const creativesStorage = {
        used: totalContents || 0,
        limit: creativesLimit,
        percentage: creativesLimit > 0 ? ((totalContents || 0) / creativesLimit) * 100 : 0,
      };

      // Card 03: Equipe
      const { count: teamMembersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      const teamMembersLimit = entitlements?.team_members_limit || 0;
      const teamMembers = {
        used: teamMembersCount || 0,
        limit: teamMembersLimit,
        percentage: teamMembersLimit > 0 ? ((teamMembersCount || 0) / teamMembersLimit) * 100 : 0,
      };

      // Card 04: Índice de Aprovação
      const { count: approvedCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'approved');

      const { count: totalContentsForApproval } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      const approvalRate = {
        approved: approvedCount || 0,
        total: totalContentsForApproval || 0,
        percentage: totalContentsForApproval ? ((approvedCount || 0) / totalContentsForApproval) * 100 : 0,
      };

      // Card 05: Índice de Refações (ajustes solicitados)
      const { count: adjustmentsCount } = await supabase
        .from('comments')
        .select('content_id, contents!inner(agency_id)', { count: 'exact', head: true })
        .eq('is_adjustment_request', true)
        .eq('contents.agency_id', agencyId);

      const reworkRate = {
        adjustments: adjustmentsCount || 0,
        total: totalContentsForApproval || 0,
        percentage: totalContentsForApproval ? ((adjustmentsCount || 0) / totalContentsForApproval) * 100 : 0,
      };

      // Card 06: Índice de Rejeição (changes_requested)
      const { count: rejectedCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'changes_requested');

      const rejectionRate = {
        rejected: rejectedCount || 0,
        total: totalContentsForApproval || 0,
        percentage: totalContentsForApproval ? ((rejectedCount || 0) / totalContentsForApproval) * 100 : 0,
      };

      setMetrics({
        creativesThisMonth,
        creativesStorage,
        teamMembers,
        approvalRate,
        reworkRate,
        rejectionRate,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas da agência');
    } finally {
      setLoading(false);
    }
  }

  return { metrics, loading, refresh: loadMetrics };
}
