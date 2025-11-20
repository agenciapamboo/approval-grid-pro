import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Download, 
  AlertTriangle, 
  CheckCircle2,
  Shield,
  RefreshCw,
  FileText,
  Activity
} from "lucide-react";
import { toast } from "sonner";

export default function DatabaseBackups() {
  const [isValidating, setIsValidating] = useState(false);

  // Query para validar secrets
  const { data: secretsValidation, isLoading: isLoadingSecrets, refetch: refetchSecrets } = useQuery({
    queryKey: ['validate-secrets'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('validate-secrets');
      
      if (error) throw error;
      return data;
    }
  });

  const handleRevalidate = async () => {
    setIsValidating(true);
    try {
      await refetchSecrets();
      toast.success('Validação concluída');
    } catch (error) {
      toast.error('Erro ao validar secrets');
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateBackup = async () => {
    try {
      toast.loading('Gerando backup completo...', { id: 'backup' });
      
      const { data, error } = await supabase.functions.invoke('export-database-backup', {
        body: { backup_type: 'manual' }
      });

      if (error) throw error;

      // Criar blob e download
      const blob = new Blob([data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-completo-${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Backup gerado com sucesso!', { id: 'backup' });
    } catch (error: any) {
      console.error('Erro ao gerar backup:', error);
      toast.error('Erro ao gerar backup: ' + error.message, { id: 'backup' });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Gerenciamento de Backups
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistema completo de backup, restauração e auditoria de banco de dados
            </p>
          </div>
        </div>

        <Tabs defaultValue="backups" className="space-y-4">
          <TabsList>
            <TabsTrigger value="backups">
              <Database className="h-4 w-4 mr-2" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="secrets">
              <Shield className="h-4 w-4 mr-2" />
              Secrets Health
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="h-4 w-4 mr-2" />
              Documentação
            </TabsTrigger>
          </TabsList>

          {/* Tab: Backups */}
          <TabsContent value="backups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Backup Completo do Banco</CardTitle>
                    <CardDescription>
                      Gere um backup completo de todas as tabelas do sistema
                    </CardDescription>
                  </div>
                  <Button onClick={handleGenerateBackup}>
                    <Download className="mr-2 h-4 w-4" />
                    Gerar Backup Agora
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Importante sobre Secrets</AlertTitle>
                  <AlertDescription className="text-sm space-y-2">
                    <p>
                      Por segurança, as <strong>secrets do Supabase Vault NÃO são incluídas</strong> no backup.
                    </p>
                    <p>
                      Após restaurar um backup, você precisará reconfigurar manualmente as secrets críticas.
                      Veja a aba "Secrets Health" para mais detalhes.
                    </p>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Senhas de Usuários</AlertTitle>
                  <AlertDescription className="text-sm">
                    Senhas de usuários <strong>não são exportadas</strong> por segurança. 
                    Após restauração, todos os usuários precisarão redefinir suas senhas.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">O que é incluído no backup:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Todas as 47 tabelas do sistema</li>
                    <li>Metadados de usuários (sem senhas)</li>
                    <li>Webhooks configurados (URLs em system_settings)</li>
                    <li>Tokens sociais (criptografados)</li>
                    <li>Instruções detalhadas de restauração</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Secrets Health */}
          <TabsContent value="secrets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Status das Secrets do Sistema
                    </CardTitle>
                    <CardDescription>
                      Validação automática das secrets críticas e importantes
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleRevalidate}
                    disabled={isValidating}
                    variant="outline"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Revalidar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingSecrets ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Validando secrets...</span>
                  </div>
                ) : secretsValidation ? (
                  <>
                    {/* Status Geral */}
                    {secretsValidation.all_critical_present ? (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">
                          ✅ Todas as Secrets Críticas Configuradas
                        </AlertTitle>
                        <AlertDescription className="text-green-700">
                          O sistema está funcionando corretamente. Todas as secrets obrigatórias estão presentes.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>
                          ⚠️ {secretsValidation.missing.critical.length} Secret(s) Crítica(s) Ausente(s)
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>O sistema não funcionará corretamente sem estas secrets:</p>
                          <ul className="list-disc list-inside font-mono text-sm">
                            {secretsValidation.missing.critical.map((secret: string) => (
                              <li key={secret}>{secret}</li>
                            ))}
                          </ul>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => window.open('/docs/SECRETS_RECOVERY_GUIDE.md', '_blank')}
                          >
                            <FileText className="mr-2 h-3 w-3" />
                            Ver Guia de Recuperação
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Críticas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {secretsValidation.stats.critical_ok}/{secretsValidation.stats.critical_total}
                          </div>
                          <p className="text-xs text-muted-foreground">Obrigatórias</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Importantes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {secretsValidation.stats.important_ok}/{secretsValidation.stats.important_total}
                          </div>
                          <p className="text-xs text-muted-foreground">Opcionais</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Auto-Geradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {secretsValidation.stats.auto_ok}/{secretsValidation.stats.auto_total}
                          </div>
                          <p className="text-xs text-muted-foreground">Supabase</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detalhes das Secrets Críticas */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">🔴 Secrets Críticas</h3>
                      {secretsValidation.results.critical.map((secret: any) => (
                        <div 
                          key={secret.name}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono">{secret.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {secret.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {secret.description}
                            </p>
                          </div>
                          {secret.present ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Configurada
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Ausente
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Detalhes das Secrets Importantes */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">🟡 Secrets Importantes</h3>
                      {secretsValidation.results.important.map((secret: any) => (
                        <div 
                          key={secret.name}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono">{secret.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {secret.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {secret.description}
                            </p>
                          </div>
                          {secret.present ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Configurada
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Opcional
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertTitle>Precisa configurar secrets?</AlertTitle>
                      <AlertDescription>
                        Consulte o guia completo de recuperação para instruções detalhadas:
                        <Button 
                          variant="link" 
                          className="p-0 h-auto font-normal ml-1"
                          onClick={() => window.open('/docs/SECRETS_RECOVERY_GUIDE.md', '_blank')}
                        >
                          docs/SECRETS_RECOVERY_GUIDE.md
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro ao Validar Secrets</AlertTitle>
                    <AlertDescription>
                      Não foi possível carregar o status das secrets. Tente revalidar.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documentação */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentação do Sistema de Backup</CardTitle>
                <CardDescription>
                  Guias e recursos para gerenciar backups e recuperação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-start space-x-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold">Guia de Recuperação de Secrets</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Instruções completas para reconfigurar todas as secrets após restauração
                      </p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto mt-2"
                        onClick={() => window.open('/docs/SECRETS_RECOVERY_GUIDE.md', '_blank')}
                      >
                        Abrir Guia →
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold">Documentação de Backup</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Métodos de backup, restauração e melhores práticas
                      </p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto mt-2"
                        onClick={() => window.open('/docs/BACKUP_DATABASE.md', '_blank')}
                      >
                        Abrir Documentação →
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold">Instruções de Migração</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Como migrar para um novo ambiente ou servidor
                      </p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto mt-2"
                        onClick={() => window.open('/docs/MIGRACAO_INSTRUCOES.md', '_blank')}
                      >
                        Abrir Instruções →
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Lembre-se</AlertTitle>
                  <AlertDescription className="text-sm">
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Backups NÃO incluem secrets do Vault por segurança</li>
                      <li>Senhas de usuários não são exportadas</li>
                      <li>Tokens sociais são exportados mas criptografados</li>
                      <li>Sempre teste backups em ambiente de staging primeiro</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
