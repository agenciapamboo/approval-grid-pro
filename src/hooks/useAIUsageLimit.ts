import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserData } from "./useUserData";

interface AIUsageLimitResult {
  canUse: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
  isUnlimited: boolean;
}

/**
 * Hook para verificar limite de uso de IA do usuário
 * Conta apenas usos não-cache do mês atual
 */
export function useAIUsageLimit() {
  const { profile, loading: userLoading } = useUserData();

  const { data: usageData, isLoading, refetch } = useQuery({
    queryKey: ['ai-usage-limit', profile?.client_id, profile?.agency_id],
    queryFn: async (): Promise<AIUsageLimitResult> => {
      if (!profile) {
        return {
          canUse: false,
          currentUsage: 0,
          limit: null,
          remaining: null,
          percentage: 0,
          isUnlimited: false,
        };
      }

      // Buscar limite do plano
      const { data: client } = await supabase
        .from('clients')
        .select('agency_id')
        .eq('id', profile.client_id!)
        .single();

      if (!client) {
        return {
          canUse: false,
          currentUsage: 0,
          limit: null,
          remaining: null,
          percentage: 0,
          isUnlimited: false,
        };
      }

      const { data: agency } = await supabase
        .from('agencies')
        .select('plan')
        .eq('id', client.agency_id)
        .single();

      if (!agency) {
        return {
          canUse: false,
          currentUsage: 0,
          limit: null,
          remaining: null,
          percentage: 0,
          isUnlimited: false,
        };
      }

      const { data: entitlements } = await supabase
        .from('plan_entitlements')
        .select('ai_uses_limit')
        .eq('plan', agency.plan)
        .single();

      const limit = entitlements?.ai_uses_limit || null;
      const isUnlimited = limit === null;

      // Contar usos do mês atual (apenas não-cache)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { count: currentUsage } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profile.client_id!)
        .eq('from_cache', false) // Apenas usos não-cache contam
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString());

      const usage = currentUsage || 0;
      const canUse = isUnlimited || usage < limit!;
      const remaining = isUnlimited ? null : Math.max(0, limit! - usage);
      const percentage = isUnlimited ? 0 : Math.min(100, (usage / limit!) * 100);

      return {
        canUse,
        currentUsage: usage,
        limit,
        remaining,
        percentage,
        isUnlimited,
      };
    },
    enabled: !!profile && !userLoading,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  return {
    ...usageData,
    isLoading: isLoading || userLoading,
    refetch,
  };
}
