import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkMonthlyPostsLimit, checkCreativesStorageLimit } from '@/lib/plan-limits';

export interface ClientLimitMetrics {
  clientId: string;
  clientName: string;
  plan: string;
  postsUsed: number;
  postsLimit: number | null;
  postsPercentage: number;
  creativesUsed: number;
  creativesLimit: number | null;
  creativesPercentage: number;
  teamMembers: number;
  teamMembersLimit: number | null;
  isUnlimited: boolean;
}

export function useClientLimits(clientId: string | null) {
  const [metrics, setMetrics] = useState<ClientLimitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar informações do cliente
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('name, agency_id, agencies(plan)')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;

        const plan = (clientData?.agencies as any)?.plan || 'creator';

        // Buscar limites do plano
        const { data: entitlements, error: entitlementsError } = await supabase
          .from('plan_entitlements')
          .select('*')
          .eq('plan', plan)
          .single();

        if (entitlementsError) throw entitlementsError;

        // Verificar limites de posts mensais
        const postsLimit = await checkMonthlyPostsLimit(clientId);

        // Verificar limites de criativos
        const creativesLimit = await checkCreativesStorageLimit(clientId);

        // Contar team members (se aplicável) - busca profiles com agency_id
        const { count: teamCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', clientData.agency_id);

        const isUnlimited = 
          entitlements.posts_limit === null && 
          entitlements.creatives_limit === null;

        setMetrics({
          clientId,
          clientName: clientData.name,
          plan,
          postsUsed: postsLimit.currentCount,
          postsLimit: postsLimit.limit,
          postsPercentage: postsLimit.limit 
            ? Math.round((postsLimit.currentCount / postsLimit.limit) * 100)
            : 0,
          creativesUsed: creativesLimit.currentCount,
          creativesLimit: creativesLimit.limit,
          creativesPercentage: creativesLimit.limit
            ? Math.round((creativesLimit.currentCount / creativesLimit.limit) * 100)
            : 0,
          teamMembers: teamCount || 0,
          teamMembersLimit: entitlements.team_members_limit,
          isUnlimited,
        });
      } catch (err) {
        console.error('Error fetching client metrics:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar métricas');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [clientId]);

  return { metrics, loading, error };
}

export function useAgencyLimits(agencyId: string | null) {
  const [allMetrics, setAllMetrics] = useState<ClientLimitMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setAllMetrics([]);
      setLoading(false);
      return;
    }

    const fetchAllMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar todos os clientes da agência
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, agency_id, agencies(plan)')
          .eq('agency_id', agencyId);

        if (clientsError) throw clientsError;

        if (!clients || clients.length === 0) {
          setAllMetrics([]);
          return;
        }

        // Buscar métricas para cada cliente
        const metricsPromises = clients.map(async (client) => {
          const plan = (client.agencies as any)?.plan || 'creator';

          // Buscar entitlements do plano
          const { data: entitlements } = await supabase
            .from('plan_entitlements')
            .select('*')
            .eq('plan', plan)
            .single();

          // Verificar limites
          const postsLimit = await checkMonthlyPostsLimit(client.id);
          const creativesLimit = await checkCreativesStorageLimit(client.id);

          const isUnlimited = 
            entitlements?.posts_limit === null && 
            entitlements?.creatives_limit === null;

          return {
            clientId: client.id,
            clientName: client.name,
            plan,
            postsUsed: postsLimit.currentCount,
            postsLimit: postsLimit.limit,
            postsPercentage: postsLimit.limit 
              ? Math.round((postsLimit.currentCount / postsLimit.limit) * 100)
              : 0,
            creativesUsed: creativesLimit.currentCount,
            creativesLimit: creativesLimit.limit,
            creativesPercentage: creativesLimit.limit
              ? Math.round((creativesLimit.currentCount / creativesLimit.limit) * 100)
              : 0,
            teamMembers: 0, // Pode ser calculado se necessário
            teamMembersLimit: entitlements?.team_members_limit || null,
            isUnlimited,
          } as ClientLimitMetrics;
        });

        const results = await Promise.all(metricsPromises);
        setAllMetrics(results);
      } catch (err) {
        console.error('Error fetching agency metrics:', err);
        setError(err instanceof Error ? err.message : 'Erro ao buscar métricas');
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();
  }, [agencyId]);

  return { allMetrics, loading, error };
}
