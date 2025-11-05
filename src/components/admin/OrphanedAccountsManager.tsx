import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, Mail, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrphanedAccount {
  id: string;
  email: string;
  created_at: string;
  user_metadata: any;
}

export const OrphanedAccountsManager = () => {
  const [orphanedAccounts, setOrphanedAccounts] = useState<OrphanedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [lastJobResult, setLastJobResult] = useState<any>(null);

  const fetchOrphanedAccounts = async () => {
    setLoading(true);
    try {
      // Buscar todos os usuários do auth
      const { data, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) throw usersError;

      const users = data?.users || [];

      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
      
      if (profilesError) throw profilesError;

      const profileIds = new Set((profiles || []).map((p: any) => p.id));
      
      // Filtrar contas órfãs
      const orphans = users
        .filter(user => !profileIds.has(user.id))
        .map(user => ({
          id: user.id,
          email: user.email || 'sem-email',
          created_at: user.created_at,
          user_metadata: user.user_metadata
        }));

      setOrphanedAccounts(orphans);
      
      if (orphans.length === 0) {
        toast.success("Nenhuma conta órfã encontrada!");
      } else {
        toast.info(`${orphans.length} conta(s) órfã(s) encontrada(s)`);
      }
    } catch (error) {
      console.error('Erro ao buscar contas órfãs:', error);
      toast.error("Erro ao buscar contas órfãs");
    } finally {
      setLoading(false);
    }
  };

  const runCleanupJob = async () => {
    setRunningJob(true);
    try {
      toast.info("Executando job de limpeza...");
      
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-accounts');
      
      if (error) throw error;

      setLastJobResult(data);
      
      toast.success(
        `Job concluído! ${data.fixed?.length || 0} contas corrigidas, ${data.failed?.length || 0} falhas`
      );
      
      // Recarregar lista após o job
      await fetchOrphanedAccounts();
    } catch (error) {
      console.error('Erro ao executar job:', error);
      toast.error("Erro ao executar job de limpeza");
    } finally {
      setRunningJob(false);
    }
  };

  const deleteAccount = async (accountId: string, email: string) => {
    if (!window.confirm(`⚠️ ATENÇÃO: Deseja excluir permanentemente a conta de ${email}?\n\nEsta ação NÃO pode ser desfeita!`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(accountId);
      
      if (error) throw error;

      toast.success(`Conta ${email} excluída com sucesso`);
      setOrphanedAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error("Erro ao excluir conta");
    }
  };

  useEffect(() => {
    fetchOrphanedAccounts();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Contas Órfãs
              </CardTitle>
              <CardDescription>
                Usuários sem perfil associado que podem causar problemas no sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrphanedAccounts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={runCleanupJob}
                disabled={runningJob}
              >
                <CheckCircle className={`h-4 w-4 mr-2 ${runningJob ? 'animate-spin' : ''}`} />
                Executar Job
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastJobResult && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Último job: {lastJobResult.fixed?.length || 0} contas corrigidas, {' '}
                {lastJobResult.failed?.length || 0} falhas
              </AlertDescription>
            </Alert>
          )}

          {orphanedAccounts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma conta órfã encontrada. Sistema saudável!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {orphanedAccounts.length} conta(s) órfã(s) detectada(s):
              </p>
              {orphanedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">{account.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Criado em: {format(new Date(account.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {account.id}
                      </div>
                      {account.user_metadata?.name && (
                        <div className="text-xs text-muted-foreground">
                          Nome: {account.user_metadata.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAccount(account.id, account.email)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
