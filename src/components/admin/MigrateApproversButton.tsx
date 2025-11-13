import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserCog, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: Array<{
    approver_id: string;
    email: string;
    error: string;
  }>;
}

export function MigrateApproversButton() {
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<MigrationResult | null>(null);

  const handleMigrate = async () => {
    setLoading(true);

    try {
      console.log('[MigrateApprovers] Iniciando migração...');

      const { data, error } = await supabase.functions.invoke('migrate-approvers-to-auth', {
        body: {}
      });

      if (error) {
        console.error('[MigrateApprovers] Erro:', error);
        toast.error('Erro ao executar migração');
        return;
      }

      if (!data?.success) {
        console.error('[MigrateApprovers] Falha:', data?.error);
        toast.error(data?.error || 'Erro desconhecido na migração');
        return;
      }

      console.log('[MigrateApprovers] Resultado:', data.results);
      setResults(data.results);
      setShowResults(true);

      if (data.results.errors.length === 0) {
        toast.success(`Migração concluída! ${data.results.migrated} aprovadores convertidos.`);
      } else {
        toast.warning(`Migração concluída com ${data.results.errors.length} erros. Veja os detalhes.`);
      }
    } catch (error: any) {
      console.error('[MigrateApprovers] Erro inesperado:', error);
      toast.error('Erro inesperado ao executar migração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleMigrate}
        disabled={loading}
        variant="default"
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Migrando aprovadores...
          </>
        ) : (
          <>
            <UserCog className="h-5 w-5" />
            Migrar Aprovadores para Auth
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado da Migração</DialogTitle>
            <DialogDescription>
              Conversão de aprovadores em usuários autenticados
            </DialogDescription>
          </DialogHeader>

          {results && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="ml-2">
                    <strong>{results.migrated}</strong> aprovadores migrados com sucesso
                  </AlertDescription>
                </Alert>

                {results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <strong>{results.errors.length}</strong> erros encontrados
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Lista de Erros */}
              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Erros na Migração:</h4>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-3">
                      {results.errors.map((err, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm"
                        >
                          <div className="font-medium text-foreground">
                            {err.email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {err.approver_id}
                          </div>
                          <div className="text-xs text-destructive mt-2">
                            {err.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Mensagem de Sucesso Total */}
              {results.errors.length === 0 && results.migrated > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="ml-2">
                    Todos os aprovadores foram migrados com sucesso! Agora eles podem fazer login via 2FA
                    e serão autenticados como usuários reais do sistema.
                  </AlertDescription>
                </Alert>
              )}

              {/* Nenhum aprovador para migrar */}
              {results.migrated === 0 && results.errors.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Não foram encontrados aprovadores para migrar. Todos já possuem contas de usuário.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowResults(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
