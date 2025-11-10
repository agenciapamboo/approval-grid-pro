import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, UserCog, ShieldAlert } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function StripeSync() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [syncingSubscriptions, setSyncingSubscriptions] = useState(false);
  const [fixingOrphans, setFixingOrphans] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [orphanResult, setOrphanResult] = useState<any>(null);
  const [authError, setAuthError] = useState(false);

  const handleSyncSubscriptions = async () => {
    setSyncingSubscriptions(true);
    setSyncResult(null);
    setAuthError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-subscriptions');

      if (error) throw error;

      if (data?.isAuthError) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem sincronizar assinaturas",
        });
        return;
      }

      setSyncResult(data);
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} assinaturas sincronizadas. ${data.errors} erros.`,
      });
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem sincronizar assinaturas",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao sincronizar",
          description: error.message,
        });
      }
    } finally {
      setSyncingSubscriptions(false);
    }
  };

  const handleFixOrphans = async () => {
    setFixingOrphans(true);
    setOrphanResult(null);
    setAuthError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-orphaned-users');

      if (error) throw error;

      if (data?.isAuthError) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem corrigir usuários órfãos",
        });
        return;
      }

      setOrphanResult(data);
      toast({
        title: "Correção concluída",
        description: `${data.fixed} usuários corrigidos de ${data.total} encontrados.`,
      });
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        setAuthError(true);
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas super admins podem corrigir usuários órfãos",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao corrigir usuários",
          description: error.message,
        });
      }
    } finally {
      setFixingOrphans(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sincronização Stripe</h1>
          <p className="text-muted-foreground">
            Ferramentas de manutenção e sincronização de dados do Stripe
          </p>
          {user && (
            <p className="text-sm text-muted-foreground mt-1">
              Logado como: {user.email}
            </p>
          )}
        </div>

        {authError && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              <strong>Acesso Negado:</strong> Apenas usuários com role <code>super_admin</code> podem executar estas operações.
              Faça login com uma conta de super administrador para continuar.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Sync Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronizar Assinaturas
              </CardTitle>
              <CardDescription>
                Busca assinaturas ativas no Stripe e atualiza os perfis dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSyncSubscriptions}
                disabled={syncingSubscriptions}
                className="w-full"
              >
                {syncingSubscriptions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar Agora
                  </>
                )}
              </Button>

              {syncResult && (
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total processado:</span>
                    <span className="font-medium">{syncResult.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sincronizadas:</span>
                    <span className="font-medium text-green-600">{syncResult.synced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Erros:</span>
                    <span className="font-medium text-red-600">{syncResult.errors}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fix Orphaned Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Corrigir Usuários Órfãos
              </CardTitle>
              <CardDescription>
                Cria agências para usuários com planos pagos mas sem agência associada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleFixOrphans}
                disabled={fixingOrphans}
                className="w-full"
                variant="secondary"
              >
                {fixingOrphans ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Corrigindo...
                  </>
                ) : (
                  <>
                    <UserCog className="mr-2 h-4 w-4" />
                    Corrigir Usuários
                  </>
                )}
              </Button>

              {orphanResult && (
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total encontrados:</span>
                    <span className="font-medium">{orphanResult.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Corrigidos:</span>
                    <span className="font-medium text-green-600">{orphanResult.fixed}</span>
                  </div>
                  
                  {orphanResult.results && orphanResult.results.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                      <p className="font-semibold">Detalhes:</p>
                      {orphanResult.results.map((result: any, idx: number) => (
                        <div key={idx} className="text-xs border-l-2 border-primary pl-2 py-1">
                          <p className="font-medium">{result.user_email}</p>
                          {result.status === 'fixed' ? (
                            <p className="text-green-600">✓ {result.agency_name}</p>
                          ) : (
                            <p className="text-red-600">✗ {result.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Como usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Sincronizar Assinaturas</h4>
              <p className="text-muted-foreground">
                Use quando precisar atualizar o status de assinaturas existentes. 
                Busca no Stripe todas as assinaturas ativas e atualiza os dados no banco.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Corrigir Usuários Órfãos</h4>
              <p className="text-muted-foreground">
                Use quando houver usuários com planos pagos mas sem agência associada.
                Cria automaticamente uma agência para cada usuário órfão e atualiza suas permissões.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}