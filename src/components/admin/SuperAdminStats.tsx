import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SuperAdminStats() {
  const [stats, setStats] = useState<{
    totalAgencies: number;
    totalContents: number;
    monthlyRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total de agências
      const { count: agenciesCount } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });

      // Total de conteúdos
      const { count: contentsCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true });

      // Receita do mês atual (do financial_snapshots mais recente)
      const { data: latestSnapshot } = await supabase
        .from('financial_snapshots')
        .select('total_mrr')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        totalAgencies: agenciesCount || 0,
        totalContents: contentsCount || 0,
        monthlyRevenue: latestSnapshot?.total_mrr || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Agências</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalAgencies || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Agências cadastradas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Conteúdos</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalContents || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Conteúdos criados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(stats?.monthlyRevenue || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            MRR atual
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
