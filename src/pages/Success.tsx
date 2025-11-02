import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [planInfo, setPlanInfo] = useState<{ plan: string; billingCycle: string } | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      toast.error("Sessão inválida");
      navigate("/planos");
      return;
    }

    // Fetch user profile to get plan info
    const fetchPlanInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('plan, billing_cycle')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setPlanInfo({
          plan: profile.plan || '',
          billingCycle: profile.billing_cycle || ''
        });
      } catch (error) {
        console.error('Error fetching plan info:', error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to allow webhook to process
    setTimeout(fetchPlanInfo, 2000);
  }, [searchParams, navigate]);

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      eugencia: 'Eugência',
      socialmidia: 'Agência Social Mídia',
      fullservice: 'Agência Full Service',
      creator: 'Creator'
    };
    return names[plan] || plan;
  };

  const getBillingCycleName = (cycle: string) => {
    return cycle === 'monthly' ? 'Mensal' : 'Anual';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processando sua assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Assinatura Confirmada!</CardTitle>
          <CardDescription>
            Sua assinatura foi processada com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {planInfo && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Detalhes da assinatura</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Plano:</span>{' '}
                  <span className="font-medium">{getPlanName(planInfo.plan)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Ciclo de cobrança:</span>{' '}
                  <span className="font-medium">{getBillingCycleName(planInfo.billingCycle)}</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate("/dashboard")}
            >
              Ir para o painel
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/minha-assinatura")}
            >
              Ver minha assinatura
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você receberá um email de confirmação com os detalhes da sua assinatura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
