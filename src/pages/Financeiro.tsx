import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialOverviewCards } from "@/components/admin/FinancialOverviewCards";
import { CostPerClientTable } from "@/components/admin/CostPerClientTable";
import { LovablePlanConfig } from "@/components/admin/LovablePlanConfig";
import { RevenueTaxesManager } from "@/components/admin/RevenueTaxesManager";
import { OperationalCostsManager } from "@/components/admin/OperationalCostsManager";
import { ArrowLeft, DollarSign, Database } from "lucide-react";
import { Loader2 } from "lucide-react";

const Financeiro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (profileData) {
        setProfile({ ...profileData, role: roleData || 'client_user' });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader userName={profile?.name} userRole={profile?.role} onSignOut={() => navigate("/auth")} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              Painel Financeiro
            </h1>
            <p className="text-muted-foreground">
              Acompanhe métricas financeiras, custos e receitas
            </p>
          </div>

          {/* Métricas Gerais */}
          <FinancialOverviewCards />
          
          {/* Plano Lovable - Recursos Contratados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Plano Lovable Cloud
              </CardTitle>
              <CardDescription>
                Configure limites de recursos e custos de overage do backend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LovablePlanConfig />
            </CardContent>
          </Card>

          {/* Taxas sobre Receita */}
          <RevenueTaxesManager />

          {/* Gestão de Custos Operacionais */}
          <OperationalCostsManager />
          
          {/* Custo por Cliente */}
          <CostPerClientTable />
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default Financeiro;
