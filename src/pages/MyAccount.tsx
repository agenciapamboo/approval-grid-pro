import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Calendar, TrendingUp, TrendingDown, AlertCircle, ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { STRIPE_PRODUCTS } from "@/lib/stripe-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const MyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingBilling, setProcessingBilling] = useState(false);
  const { status: subscriptionStatus, loading: statusLoading } = useSubscriptionStatus();

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

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setProcessingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível abrir o portal de pagamento.",
      });
    } finally {
      setProcessingBilling(false);
    }
  };

  const handleUpgradePlan = (targetPlan: string) => {
    navigate(`/pricing?upgrade=${targetPlan}`);
  };

  const getPlanName = (plan: string) => {
    const planMap: Record<string, string> = {
      creator: "Creator (Gratuito)",
      eugencia: "Eugência",
      socialMidia: "Social Mídia",
      fullService: "Full Service",
    };
    return planMap[plan] || plan;
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null;

    if (subscriptionStatus.isBlocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }

    if (subscriptionStatus.subscriptionStatus === 'active') {
      return <Badge variant="default">Ativo</Badge>;
    }

    if (subscriptionStatus.subscriptionStatus === 'trialing') {
      return <Badge variant="outline">Período de teste</Badge>;
    }

    if (subscriptionStatus.delinquent) {
      return <Badge variant="destructive">Pagamento pendente</Badge>;
    }

    return <Badge variant="outline">Inativo</Badge>;
  };

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscriptionStatus) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader userName={profile?.name} onSignOut={() => navigate("/auth")} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Erro ao carregar informações</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  const currentPlan = subscriptionStatus.plan;
  const availableUpgrades = Object.keys(STRIPE_PRODUCTS).filter(
    (key) => key !== currentPlan && key !== 'creator'
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted to-background">
      <AppHeader 
        userName={profile?.name}
        userRole={profile?.role}
        onSignOut={() => navigate("/auth")}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
            <p className="text-muted-foreground">
              Gerencie seu plano e assinatura
            </p>
          </div>

          {/* Alertas */}
          {subscriptionStatus.isInGracePeriod && subscriptionStatus.gracePeriodEnd && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Período de carência ativo. Sua assinatura será cancelada em{" "}
                {format(new Date(subscriptionStatus.gracePeriodEnd), "dd/MM/yyyy", { locale: ptBR })}.
                Atualize seu pagamento para continuar.
              </AlertDescription>
            </Alert>
          )}

          {subscriptionStatus.isBlocked && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sua conta está bloqueada. 
                {subscriptionStatus.blockReason === 'subscription_canceled' && " Sua assinatura foi cancelada."}
                {subscriptionStatus.blockReason === 'grace_period_expired' && " O período de carência expirou."}
                {subscriptionStatus.blockReason === 'subscription_expired' && " Sua assinatura expirou."}
                {" "}Atualize sua assinatura para continuar usando o serviço.
              </AlertDescription>
            </Alert>
          )}

          {/* Plano Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Plano Atual</span>
                {getStatusBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{getPlanName(currentPlan)}</p>
                {subscriptionStatus.entitlements && (
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <strong>Posts por mês:</strong>{" "}
                      {subscriptionStatus.entitlements.posts_limit === null
                        ? "Ilimitados"
                        : subscriptionStatus.entitlements.posts_limit}
                    </p>
                    <p>
                      <strong>Criativos por mês:</strong>{" "}
                      {subscriptionStatus.entitlements.creatives_limit === null
                        ? "Ilimitados"
                        : subscriptionStatus.entitlements.creatives_limit}
                    </p>
                    <p>
                      <strong>Histórico:</strong>{" "}
                      {subscriptionStatus.entitlements.history_days} dias
                    </p>
                    <p>
                      <strong>Membros do time:</strong>{" "}
                      {subscriptionStatus.entitlements.team_members_limit === null
                        ? "Ilimitados"
                        : subscriptionStatus.entitlements.team_members_limit}
                    </p>
                  </div>
                )}
              </div>

              {profile?.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Renovação em {format(new Date(profile.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gerenciar Assinatura */}
          {subscriptionStatus.isPro && subscriptionStatus.subscriptionStatus === 'active' && (
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Assinatura</CardTitle>
                <CardDescription>
                  Atualize seu método de pagamento, veja faturas ou cancele sua assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleManageBilling}
                  disabled={processingBilling}
                  className="w-full sm:w-auto"
                >
                  {processingBilling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Abrindo...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Gerenciar no Stripe
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upgrade/Downgrade */}
          {availableUpgrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Outros Planos</CardTitle>
                <CardDescription>
                  Explore outros planos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableUpgrades.map((planKey) => {
                  const product = STRIPE_PRODUCTS[planKey as keyof typeof STRIPE_PRODUCTS];
                  const isUpgrade = ['eugencia', 'socialMidia', 'fullService'].indexOf(planKey) >
                    ['creator', 'eugencia', 'socialMidia', 'fullService'].indexOf(currentPlan);

                  return (
                    <div
                      key={planKey}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                      <Button
                        variant={isUpgrade ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpgradePlan(planKey)}
                      >
                        {isUpgrade ? (
                          <>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Fazer upgrade
                          </>
                        ) : (
                          <>
                            <TrendingDown className="mr-2 h-4 w-4" />
                            Mudar para este plano
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Plano Gratuito - Upgrade */}
          {currentPlan === 'creator' && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Faça upgrade do seu plano</CardTitle>
                <CardDescription>
                  Desbloqueie recursos premium e expanda sua capacidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/pricing")} className="w-full sm:w-auto">
                  Ver Planos Disponíveis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default MyAccount;
