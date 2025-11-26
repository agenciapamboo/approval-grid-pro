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
import { ResourceUsagePanel } from "@/components/admin/ResourceUsagePanel";
import { RevenueTaxesManager } from "@/components/admin/RevenueTaxesManager";
import { OperationalCostsManager } from "@/components/admin/OperationalCostsManager";
import { DollarSign, Database, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccessGate from "@/components/auth/AccessGate";

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
    <AccessGate allow={['super_admin']}>
      <AppLayout>
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex flex-wrap items-center gap-2">
              <DollarSign className="h-6 w-6 md:h-8 md:w-8" />
              <span>Painel Financeiro</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Acompanhe métricas financeiras, custos e receitas
            </p>
          </div>

          {/* Métricas Gerais */}
          <FinancialOverviewCards />
          
          {/* Plano Lovable - Recursos Contratados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex flex-wrap items-center gap-2">
                <Database className="h-4 w-4 md:h-5 md:w-5" />
                Plano Lovable Cloud
              </CardTitle>
              <CardDescription className="text-sm">
                Configure limites de recursos e custos de overage do backend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LovablePlanConfig />
            </CardContent>
          </Card>

          {/* Uso de Recursos Atual */}
          <ResourceUsagePanel />

          {/* Taxas sobre Receita */}
          <RevenueTaxesManager />

          {/* Gestão de Custos Operacionais */}
          <OperationalCostsManager />
          
          {/* Custo por Cliente */}
          <CostPerClientTable />
        </div>
        </div>
      </AppLayout>
    </AccessGate>
  );
};

export default Financeiro;
