import { AlertCircle, Clock, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RateLimitBlockedAlertProps {
  type: 'RATE_LIMIT' | 'IP_BLOCKED' | 'INVALID_TOKEN';
  message: string;
  countdown?: number;
  blockedUntil?: string;
  ipAddress?: string;
  failedAttempts?: number;
  attemptsRemaining?: number;
}

export const RateLimitBlockedAlert = ({
  type,
  message,
  countdown,
  blockedUntil,
  ipAddress,
  failedAttempts,
  attemptsRemaining
}: RateLimitBlockedAlertProps) => {
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("IP copiado para a área de transferência");
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (type === 'IP_BLOCKED') {
    return (
      <Alert variant="destructive" className="my-8">
        <Shield className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-3">
          Acesso Bloqueado Temporariamente
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm">
            {message}
          </p>
          
          {countdown !== undefined && countdown > 0 && (
            <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-lg font-semibold">
                {formatCountdown(countdown)}
              </span>
              <span className="text-sm text-muted-foreground">até o desbloqueio</span>
            </div>
          )}

          {failedAttempts !== undefined && (
            <p className="text-sm">
              <strong>Tentativas falhas na última hora:</strong> {failedAttempts}
            </p>
          )}

          {ipAddress && (
            <div className="space-y-2 p-4 bg-background/50 rounded-md border border-border">
              <p className="text-sm font-semibold text-destructive">
                ⚠️ Seu IP foi bloqueado por 15 minutos devido a múltiplas tentativas falhas
              </p>
              <p className="text-sm">
                Para solicitar o desbloqueio imediato, entre em contato com o suporte e informe o seguinte IP:
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono select-all">
                  {ipAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(ipAddress)}
                >
                  Copiar IP
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Por segurança, bloqueamos temporariamente o acesso por 15 minutos após 10 tentativas de validação falhas na última hora.
              Aguarde o tempo de bloqueio ou entre em contato com o suporte para desbloqueio imediato.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (type === 'RATE_LIMIT') {
    return (
      <Alert variant="destructive" className="my-8">
        <Clock className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-3">
          Limite de Tentativas Excedido
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm">
            {message}
          </p>
          
          {countdown !== undefined && countdown > 0 && (
            <div className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
              <span className="text-sm">Aguarde:</span>
              <span className="font-mono text-lg font-semibold">
                {formatCountdown(countdown)}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Limite: 10 tentativas por minuto. Após 10 tentativas falhas na última hora, seu IP será bloqueado por 15 minutos.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (type === 'INVALID_TOKEN') {
    const showPasswordRecovery = failedAttempts !== undefined && failedAttempts >= 3;
    
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-3">
          Token Inválido ou Expirado
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm">
            {message}
          </p>
          
          {attemptsRemaining !== undefined && (
            <div className="p-3 bg-background/50 rounded-md border border-border">
              <p className="text-sm">
                <strong>Tentativas restantes:</strong> {attemptsRemaining} de 10 (última hora)
              </p>
              {attemptsRemaining <= 2 && attemptsRemaining > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                  ⚠️ Atenção: Após 10 tentativas falhas na última hora, seu IP será bloqueado por 15 minutos
                </p>
              )}
              {attemptsRemaining === 0 && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Próxima tentativa falhada bloqueará seu IP por 15 minutos
                </p>
              )}
            </div>
          )}

          {failedAttempts !== undefined && failedAttempts > 0 && (
            <p className="text-xs text-muted-foreground">
              Você teve {failedAttempts} tentativa(s) falha(s) na última hora.
            </p>
          )}

          {showPasswordRecovery && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                💡 Sugestão
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Se você está tendo dificuldades com o link de aprovação, entre em contato com quem enviou o link para solicitar um novo, ou verifique se o link não expirou.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Verifique se o link está correto ou entre em contato com quem enviou o link de aprovação para obter um novo.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
