import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Building2, Search, Users, Calendar, Plus, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import { AddAgencyDialog } from "@/components/admin/AddAgencyDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  plan?: string | null;
  plan_renewal_date?: string | null;
  created_at?: string;
  email?: string | null;
  whatsapp?: string | null;
}

const Agencias = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientCounts, setClientCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verificar se é super_admin
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (roleData !== 'super_admin') {
        toast.error("Acesso negado");
        navigate("/dashboard");
        return;
      }

      await loadAgencies();
    } catch (error) {
      console.error("Erro ao carregar agências:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadAgencies = async () => {
    const { data: agenciesData, error } = await supabase
      .from("agencies")
      .select("*")
      .order("name");

    if (error) {
      console.error("Erro ao carregar agências:", error);
      toast.error("Erro ao carregar agências");
      return;
    }

    setAgencies(agenciesData || []);
    setFilteredAgencies(agenciesData || []);

    // Contar clientes por agência
    const { data: clientsData } = await supabase
      .from("clients")
      .select("agency_id");

    const counts: Record<string, number> = {};
    (clientsData || []).forEach((c: any) => {
      counts[c.agency_id] = (counts[c.agency_id] || 0) + 1;
    });
    setClientCounts(counts);
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAgencies(agencies);
    } else {
      const filtered = agencies.filter((agency) =>
        agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAgencies(filtered);
    }
  }, [searchQuery, agencies]);

  const getPlanBadgeVariant = (plan?: string | null): "default" | "outline" => {
    if (!plan || plan === "free") return "outline";
    return "default";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agências</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as agências do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/blocked-ips')}
            >
              <Shield className="w-4 h-4 mr-2" />
              IPs Bloqueados
            </Button>
            <AddAgencyDialog onAgencyAdded={loadAgencies} />
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar agências..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgencies.map((agency) => (
            <Card key={agency.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {agency.logo_url ? (
                      <img
                        src={agency.logo_url}
                        alt={agency.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{agency.name}</CardTitle>
                      <CardDescription>@{agency.slug}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={getPlanBadgeVariant(agency.plan)}>
                    {agency.plan || "free"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{clientCounts[agency.id] || 0} clientes</span>
                  </div>
                  {agency.plan_renewal_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Renovação: {format(new Date(agency.plan_renewal_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate(`/agencias/${agency.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAgencies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhuma agência encontrada" : "Nenhuma agência cadastrada"}
            </p>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
};

export default Agencias;
