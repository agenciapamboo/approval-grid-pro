import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

export default function MySubscription() {
  const navigate = useNavigate();
  const { status, loading: statusLoading, refreshStatus } = useSubscriptionStatus();
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error("URL do portal não recebida");
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error("Erro ao abrir portal de pagamento");
    } finally {
      setOpeningPortal(false);
    }
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      creator: 'Creator (Gratuito)',
      eugencia: 'Eugência',
      socialmidia: 'Agência Social Mídia',
      fullservice: 'Agência Full Service',
      unlimited: 'Sem Plano (Interno)'
    };
    return names[plan] || plan;
  };

  const getStatusBadge = (subscriptionStatus: string | null, isBlocked: boolean) => {
    if (isBlocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }
    
    switch (subscriptionStatus) {
      case 'active':
        return <Badge variant="default">Ativa</Badge>;
      case 'trialing':
        return <Badge variant="outline">Teste</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pagamento pendente</Badge>;
      case 'canceled':
        return <Badge variant="outline">Cancelada</Badge>;
      case 'incomplete':
      case 'unpaid':
        return <Badge variant="destructive">Pagamento pendente</Badge>;
      default:
        return <Badge variant="outline">Gratuito</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando informações da assinatura...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Erro ao carregar assinatura</CardTitle>
            <CardDescription>
              Não foi possível carregar as informações da sua assinatura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Voltar ao painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            ← Voltar ao painel
          </Button>
          <h1 className="text-3xl font-bold mb-2">Minha Assinatura</h1>
          <p className="text-muted-foreground">Gerencie sua assinatura e pagamentos</p>
        </div>

        <div className="grid gap-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plano Atual</CardTitle>
                  <CardDescription>Detalhes da sua assinatura</CardDescription>
                </div>
                {getStatusBadge(status.subscriptionStatus, status.isBlocked)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{getPlanName(status.plan)}</h3>
                {status.skipSubscriptionCheck && (
                  <Badge variant="outline" className="ml-2 border-secondary text-secondary">Interno</Badge>
                )}
              </div>

              <Separator />

              {/* Alerts */}
              {status.isInGracePeriod && status.gracePeriodEnd && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Período de Carência</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Seu pagamento está pendente. Regularize até{' '}
                      {format(new Date(status.gracePeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {' '}para evitar o bloqueio da conta.
                    </p>
                  </div>
                </div>
              )}

              {status.isBlocked && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Conta Bloqueada</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sua conta está bloqueada. Atualize seu pagamento para reativar o acesso.
                    </p>
                  </div>
                </div>
              )}

              {/* Plan Features Summary */}
              {status.entitlements && (
                <div className="grid sm:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Posts por mês</p>
                    <p className="font-semibold">
                      {status.entitlements.posts_limit || 'Ilimitado'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Criativos por mês</p>
                    <p className="font-semibold">
                      {status.entitlements.creatives_limit || 'Ilimitado'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Histórico</p>
                    <p className="font-semibold">
                      {status.entitlements.history_days} dias
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Membros da equipe</p>
                    <p className="font-semibold">
                      {status.entitlements.team_members_limit || 'Ilimitado'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Info Card */}
          {status.subscriptionStatus && status.subscriptionStatus !== 'canceled' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informações de Cobrança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.gracePeriodEnd && status.isInGracePeriod && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Período de carência termina em
                    </p>
                    <p className="font-semibold">
                      {format(new Date(status.gracePeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}

                <Separator />

                <Button 
                  onClick={handleManageBilling}
                  disabled={openingPortal}
                  className="w-full sm:w-auto"
                >
                  {openingPortal ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Abrindo...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Gerenciar Cobrança
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Você será redirecionado para o portal seguro do Stripe para gerenciar
                  seu método de pagamento, faturas e assinatura.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Card for Free Plan (não mostrar para usuários internos) */}
          {status.plan === 'creator' && !status.isPro && !status.skipSubscriptionCheck && (
            <Card>
              <CardHeader>
                <CardTitle>Fazer Upgrade</CardTitle>
                <CardDescription>
                  Desbloqueie recursos premium com um plano pago
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/planos")}
                  className="w-full sm:w-auto"
                >
                  Ver Planos
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info Card for Internal Users */}
          {status.skipSubscriptionCheck && (
            <Card className="border-secondary">
              <CardHeader>
                <CardTitle className="text-secondary">Acesso Interno</CardTitle>
                <CardDescription>
                  Você tem acesso ilimitado a todos os recursos da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Como usuário interno, você não precisa se preocupar com limites de uso ou assinaturas.
                  Todos os recursos estão desbloqueados para você.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
