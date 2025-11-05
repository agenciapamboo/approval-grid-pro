import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileImage, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AgencyStatsProps {
  agencyId: string;
}

interface Stats {
  clients_count: number;
  posts_this_month: number;
  creatives_stored: number;
  team_members_count: number;
}

export function AgencyStats({ agencyId }: AgencyStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [agencyId]);

  const loadStats = async () => {
    try {
      // Contar clientes
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      // Contar postagens do mês
      const { count: postsCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .in('client_id', 
          (await supabase.from('clients').select('id').eq('agency_id', agencyId)).data?.map(c => c.id) || []
        );

      // Contar criativos
      const clientIds = (await supabase.from('clients').select('id').eq('agency_id', agencyId)).data?.map(c => c.id) || [];
      const contentIds = clientIds.length > 0 
        ? (await supabase.from('contents').select('id').in('client_id', clientIds)).data?.map(c => c.id) || []
        : [];
      
      const { count: creativesCount } = await supabase
        .from('content_media')
        .select('*', { count: 'exact', head: true })
        .in('content_id', contentIds.length > 0 ? contentIds : ['']);

      // Contar membros
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      setStats({
        clients_count: clientsCount || 0,
        posts_this_month: postsCount || 0,
        creatives_stored: creativesCount || 0,
        team_members_count: membersCount || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.clients_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            Ilimitado
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Postagens/Mês</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.posts_this_month || 0}</div>
          <p className="text-xs text-muted-foreground">
            Este mês
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Criativos</CardTitle>
          <FileImage className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.creatives_stored || 0}</div>
          <p className="text-xs text-muted-foreground">
            Armazenados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Equipe</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.team_members_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            Membros
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
