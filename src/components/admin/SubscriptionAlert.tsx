import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SubscriptionAlert() {
  const { status } = useSubscriptionStatus();

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Erro ao abrir portal de pagamento');
    }
  };

  if (!status || status.skipSubscriptionCheck) return null;

  // Show alert if user is in grace period
  if (status.isInGracePeriod && status.gracePeriodEnd) {
    const gracePeriodDate = new Date(status.gracePeriodEnd);
    const daysLeft = Math.ceil((gracePeriodDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Período de Carência</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Seu pagamento está pendente. Você tem {daysLeft} dia{daysLeft !== 1 ? 's' : ''} para regularizar antes do bloqueio.
          </span>
          <Button 
            onClick={handleManageSubscription}
            variant="outline" 
            size="sm"
            className="ml-4"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Atualizar Pagamento
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show alert if user is blocked
  if (status.isBlocked) {
    let message = 'Sua conta está bloqueada.';
    
    if (status.blockReason === 'subscription_canceled') {
      message = 'Sua assinatura foi cancelada. Reative para continuar usando funcionalidades premium.';
    } else if (status.blockReason === 'grace_period_expired') {
      message = 'Período de carência expirado. Atualize seu pagamento para reativar sua conta.';
    } else if (status.blockReason === 'subscription_expired') {
      message = 'Sua assinatura expirou. Renove para continuar.';
    }

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Conta Bloqueada</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          <Button 
            onClick={handleManageSubscription}
            variant="outline" 
            size="sm"
            className="ml-4"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Gerenciar Assinatura
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show info if user is on free plan
  if (status.plan === 'creator' && !status.isPro) {
    return (
      <Alert className="mb-4">
        <AlertTitle>Plano Gratuito</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Você está no plano Creator. Faça upgrade para desbloquear recursos premium.</span>
          <Button 
            onClick={() => window.location.href = '/planos'}
            variant="default" 
            size="sm"
            className="ml-4"
          >
            Ver Planos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
