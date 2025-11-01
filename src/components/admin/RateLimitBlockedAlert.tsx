import { AlertCircle, Clock, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RateLimitBlockedAlertProps {
  type: 'RATE_LIMIT' | 'IP_BLOCKED_PERMANENT' | 'IP_BLOCKED_TEMPORARY' | 'INVALID_TOKEN';
  message: string;
  countdown?: number;
  blockedUntil?: string;
  ipAddress?: string;
  failedAttempts?: number;
  attemptsRemaining?: number;
  showWarning?: boolean;
  showTemporaryBlockWarning?: boolean;
  showPermanentBlockWarning?: boolean;
}

export const RateLimitBlockedAlert = ({
  type,
  message,
  countdown,
  blockedUntil,
  ipAddress,
  failedAttempts,
  attemptsRemaining,
  showWarning,
  showTemporaryBlockWarning,
  showPermanentBlockWarning
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

  // Bloqueio permanente - 10+ tentativas
  if (type === 'IP_BLOCKED_PERMANENT') {
    return (
      <Alert variant="destructive" className="my-8">
        <Shield className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-3">
          IP Bloqueado Permanentemente
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm">
            {message}
          </p>

          {failedAttempts !== undefined && (
            <p className="text-sm">
              <strong>Tentativas falhas na última hora:</strong> {failedAttempts}
            </p>
          )}

          {ipAddress && (
            <div className="space-y-2 p-4 bg-background/50 rounded-md border border-border">
              <p className="text-sm font-semibold text-destructive">
                ⚠️ Seu IP foi bloqueado permanentemente devido a múltiplas tentativas falhas
              </p>
              <p className="text-sm">
                Para solicitar o desbloqueio, entre em contato com o suporte e informe o seguinte IP:
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
              Por segurança, bloqueamos permanentemente o acesso após 10 tentativas de validação falhas na última hora.
              Entre em contato com o suporte para desbloqueio.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Bloqueio temporário - 5 tentativas
  if (type === 'IP_BLOCKED_TEMPORARY') {
    return (
      <Alert variant="destructive" className="my-8">
        <Clock className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-3">
          Usuário Bloqueado Temporariamente
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
              <strong>Tentativas falhas:</strong> {failedAttempts}
            </p>
          )}

          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              💡 Sugestão
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Aguarde 15 minutos ou faça a recuperação da senha para acessar novamente.
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Bloqueio de 15 minutos após 5 tentativas falhas. Após 10 tentativas na última hora, o IP será bloqueado permanentemente.
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
          
          {failedAttempts !== undefined && failedAttempts > 0 && (
            <div className="p-3 bg-background/50 rounded-md border border-border">
              <p className="text-sm">
                <strong>Tentativas falhas na última hora:</strong> {failedAttempts}
              </p>
            </div>
          )}

          {/* Regra 1: Aviso após 3 tentativas */}
          {showWarning && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Atenção
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Seu usuário pode ser bloqueado. Revise seu usuário e senha e tente novamente.
              </p>
            </div>
          )}

          {/* Regra 2: Aviso de bloqueio temporário próximo (5 tentativas) */}
          {showTemporaryBlockWarning && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-900">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                ⚠️ Bloqueio Temporário Iminente
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Próximas tentativas falhas resultarão em bloqueio de 15 minutos. Revise os dados de acesso ou faça a recuperação da senha.
              </p>
            </div>
          )}

          {/* Regra 3: Aviso de bloqueio permanente próximo (10 tentativas) */}
          {showPermanentBlockWarning && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                🚨 Limite Máximo Atingido
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                Você atingiu o limite máximo de tentativas. Próximas tentativas falhas resultarão em bloqueio permanente do IP.
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
