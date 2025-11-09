import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NewClientsStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  displayMode: 'day' | 'week' | 'month';
  recentClients: Array<{
    id: string;
    name: string;
    created_at: string;
    agency_name?: string;
  }>;
}

export const useNewClientsStats = () => {
  const [stats, setStats] = useState<NewClientsStats>({
    totalToday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    displayMode: 'month',
    recentClients: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Buscar clientes do mês
      const { data: monthClients } = await supabase
        .from("clients")
        .select("id, name, created_at, agency_id")
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false });

      const totalThisMonth = monthClients?.length || 0;

      // Filtrar semana e dia
      const weekClients = monthClients?.filter(
        (c) => new Date(c.created_at) >= weekAgo
      ) || [];
      
      const todayClients = monthClients?.filter(
        (c) => new Date(c.created_at) >= today
      ) || [];

      // Determinar modo de exibição
      let displayMode: 'day' | 'week' | 'month' = 'month';
      if (todayClients.length > 1) {
        displayMode = 'day';
      } else if (weekClients.length > 1) {
        displayMode = 'week';
      }

      // Buscar nomes das agências
      const agencyIds = [...new Set(monthClients?.map(c => c.agency_id).filter(Boolean))];
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name")
        .in("id", agencyIds);

      const agencyMap = new Map(agencies?.map(a => [a.id, a.name]) || []);

      const enrichedClients = (monthClients || []).map(c => ({
        ...c,
        agency_name: c.agency_id ? agencyMap.get(c.agency_id) : undefined,
      }));

      setStats({
        totalToday: todayClients.length,
        totalThisWeek: weekClients.length,
        totalThisMonth,
        displayMode,
        recentClients: enrichedClients.slice(0, 5), // Top 5 mais recentes
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas de novos clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: loadStats };
};
