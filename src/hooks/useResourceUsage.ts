import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResourceMetrics {
  used: number;
  quota: number;
  percentage: number;
  remaining: number;
}

export interface ResourceUsage {
  database: ResourceMetrics;
  storage: ResourceMetrics;
  egress: ResourceMetrics;
  planName: string;
}

export interface PlanConfig {
  plan_name: string;
  database_quota_mb: number;
  storage_quota_gb: number;
  egress_quota_gb: number;
  database_overage_cost_per_gb_month: number;
  storage_overage_cost_per_gb: number;
  egress_overage_cost_per_gb: number;
}

export function useResourceUsage() {
  const [usage, setUsage] = useState<ResourceUsage | null>(null);
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar configuração do plano ativo
      const { data: activePlan, error: planError } = await supabase
        .from('lovable_plan_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (planError) throw planError;
      if (!activePlan) {
        throw new Error('Nenhum plano Lovable ativo configurado');
      }

      setPlanConfig(activePlan);

      // 2. Buscar uso atual via RPC functions
      const [dbSizeResult, storageSizeResult, bandwidthResult] = await Promise.all([
        supabase.rpc('get_database_size_mb'),
        supabase.rpc('get_storage_size_gb'),
        supabase.rpc('get_monthly_bandwidth_gb')
      ]);

      if (dbSizeResult.error) throw dbSizeResult.error;
      if (storageSizeResult.error) throw storageSizeResult.error;
      if (bandwidthResult.error) throw bandwidthResult.error;

      const dbUsed = dbSizeResult.data || 0;
      const storageUsed = storageSizeResult.data || 0;
      const bandwidthUsed = bandwidthResult.data || 0;

      // 3. Calcular porcentagens e valores restantes
      const database: ResourceMetrics = {
        used: dbUsed,
        quota: activePlan.database_quota_mb,
        percentage: (dbUsed / activePlan.database_quota_mb) * 100,
        remaining: activePlan.database_quota_mb - dbUsed
      };

      const storage: ResourceMetrics = {
        used: storageUsed,
        quota: activePlan.storage_quota_gb,
        percentage: (storageUsed / activePlan.storage_quota_gb) * 100,
        remaining: activePlan.storage_quota_gb - storageUsed
      };

      const egress: ResourceMetrics = {
        used: bandwidthUsed,
        quota: activePlan.egress_quota_gb,
        percentage: (bandwidthUsed / activePlan.egress_quota_gb) * 100,
        remaining: activePlan.egress_quota_gb - bandwidthUsed
      };

      setUsage({
        database,
        storage,
        egress,
        planName: activePlan.plan_name
      });
    } catch (err) {
      console.error('Erro ao buscar uso de recursos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  return { usage, planConfig, loading, error, refetch: fetchUsage };
}
