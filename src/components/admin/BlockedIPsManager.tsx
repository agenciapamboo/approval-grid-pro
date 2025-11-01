import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Unlock, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BlockedIP {
  ip_address: string;
  blocked_until: string;
  failed_attempts: number;
  last_attempt: string;
  user_agents: string[];
}

export const BlockedIPsManager = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingIP, setUnblockingIP] = useState<string | null>(null);
  const [confirmUnblock, setConfirmUnblock] = useState<BlockedIP | null>(null);
  const { toast } = useToast();

  const loadBlockedIPs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_blocked_ips');
      
      if (error) throw error;
      
      setBlockedIPs(data || []);
    } catch (error: any) {
      console.error('Error loading blocked IPs:', error);
      toast({
        title: "Erro ao carregar IPs bloqueados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedIPs();
  }, []);

  const handleUnblock = async (ipAddress: string) => {
    setUnblockingIP(ipAddress);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.rpc('unblock_ip', {
        p_ip_address: ipAddress,
        p_unblocked_by: user.id
      });

      if (error) throw error;

      toast({
        title: "IP desbloqueado com sucesso",
        description: `O IP ${ipAddress} foi desbloqueado. Uma notificação foi enviada para o email cadastrado.`,
      });

      // Recarregar lista
      await loadBlockedIPs();
      
    } catch (error: any) {
      console.error('Error unblocking IP:', error);
      toast({
        title: "Erro ao desbloquear IP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnblockingIP(null);
      setConfirmUnblock(null);
    }
  };

  const formatTimeRemaining = (blockedUntil: string) => {
    const now = new Date();
    const until = new Date(blockedUntil);
    const diff = until.getTime() - now.getTime();
    
    if (diff <= 0) return "Expirado";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle>IPs Bloqueados</CardTitle>
                <CardDescription>
                  Gerencie IPs bloqueados por excesso de tentativas falhas
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBlockedIPs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : blockedIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum IP bloqueado no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blockedIPs.map((blockedIP) => (
                <div
                  key={blockedIP.ip_address}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {blockedIP.ip_address}
                        </code>
                        <Badge variant="destructive">Bloqueado</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tentativas falhas</p>
                          <p className="font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                            {blockedIP.failed_attempts}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tempo restante</p>
                          <p className="font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeRemaining(blockedIP.blocked_until)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bloqueado até</p>
                          <p className="font-semibold">
                            {format(new Date(blockedIP.blocked_until), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Última tentativa</p>
                          <p className="font-semibold">
                            {format(new Date(blockedIP.last_attempt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      {blockedIP.user_agents && blockedIP.user_agents.length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">User Agents:</p>
                          <div className="space-y-1">
                            {blockedIP.user_agents.slice(0, 2).map((ua, idx) => (
                              <p key={idx} className="text-xs font-mono text-muted-foreground truncate">
                                {ua}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmUnblock(blockedIP)}
                      disabled={unblockingIP === blockedIP.ip_address}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Desbloquear
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmUnblock !== null} onOpenChange={(open) => !open && setConfirmUnblock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desbloqueio</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Tem certeza que deseja desbloquear o IP abaixo?
              </p>
              {confirmUnblock && (
                <code className="block p-3 bg-muted rounded text-sm font-mono">
                  {confirmUnblock.ip_address}
                </code>
              )}
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Atenção:</strong> Uma notificação de desbloqueio será enviada para o email cadastrado na agência.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmUnblock && handleUnblock(confirmUnblock.ip_address)}
              disabled={unblockingIP !== null}
            >
              {unblockingIP ? 'Desbloqueando...' : 'Confirmar Desbloqueio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
