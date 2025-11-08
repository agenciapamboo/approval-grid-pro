import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, AlertCircle, Copy, Terminal, FileText, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TestRun {
  id: string;
  test_type: 'unit' | 'e2e' | 'coverage';
  status: 'running' | 'passed' | 'failed' | 'error';
  results: any;
  executed_by: string;
  created_at: string;
  updated_at: string;
}

const testCommands = {
  unit: 'npx vitest',
  e2e: 'npx playwright test',
  coverage: 'npx vitest --coverage',
  all: 'bash scripts/run-all-tests.sh',
};

const testDescriptions = {
  unit: 'Executa testes unitários com Vitest para validar funções e componentes isoladamente',
  e2e: 'Executa testes end-to-end com Playwright para validar fluxos completos da aplicação',
  coverage: 'Gera relatório de cobertura de código mostrando quais partes do código estão testadas',
  all: 'Executa TODOS os testes em sequência: unitários, coverage e E2E com relatório formatado',
};

export function TestRunner() {
  const { toast } = useToast();
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTestHistory((data || []) as TestRun[]);
    } catch (error) {
      console.error('Error loading test history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `Comando de ${label} copiado para a área de transferência`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "pending" | "success" | "warning"> = {
      passed: "success",
      failed: "destructive",
      error: "warning",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getTestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unit: 'Testes Unitários',
      e2e: 'Testes E2E',
      coverage: 'Cobertura de Código',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Como executar os testes</AlertTitle>
        <AlertDescription>
          Os testes devem ser executados localmente via terminal (Codespaces, VS Code, etc). Execute os comandos abaixo na raiz do projeto.
        </AlertDescription>
      </Alert>

      {/* Execução Completa - Destaque */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Executar Todos os Testes
          </CardTitle>
          <CardDescription>
            Script unificado que executa unitários + coverage + E2E em sequência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100">Pré-requisito para E2E</AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Os testes E2E precisam do servidor rodando. Abra um terminal separado e execute <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">npm run dev</code> antes de rodar os testes E2E.
            </AlertDescription>
          </Alert>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm">
            {testCommands.all}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(testCommands.all, 'Todos os Testes')}
              variant="default"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Comando Completo
            </Button>
            <Button
              onClick={() => copyToClipboard('chmod +x scripts/run-all-tests.sh && bash scripts/run-all-tests.sh', 'Script com Permissões')}
              variant="outline"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Com chmod
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Testes Individuais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Executar Testes Individuais</h3>
        <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(testCommands).filter(([type]) => type !== 'all').map(([type, command]) => (
          <Card key={type} className="relative">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                {getTestTypeLabel(type)}
              </CardTitle>
              <CardDescription className="text-xs">
                {testDescriptions[type as keyof typeof testDescriptions]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                {command}
              </div>
              <Button
                onClick={() => copyToClipboard(command, getTestTypeLabel(type))}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Comando
              </Button>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentação de Testes
          </CardTitle>
          <CardDescription>
            Informações detalhadas sobre a suite de testes do projeto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Testes Unitários (Vitest)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
                <li>Localização: <code className="text-xs bg-muted px-1 rounded">src/lib/__tests__/</code></li>
                <li>Cobertura mínima: 80%</li>
                <li>Áreas críticas: 100% de cobertura</li>
                <li>Configuração: <code className="text-xs bg-muted px-1 rounded">vitest.config.ts</code></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Testes E2E (Playwright)
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
                <li>Localização: <code className="text-xs bg-muted px-1 rounded">tests/e2e/</code></li>
                <li>Fluxos de assinatura e acesso</li>
                <li>Validação de limites de plano</li>
                <li>Configuração: <code className="text-xs bg-muted px-1 rounded">playwright.config.ts</code></li>
              </ul>
            </div>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Documentação Completa</AlertTitle>
            <AlertDescription>
              Consulte <code className="text-xs bg-muted px-1 rounded">docs/TESTES_ASSINATURA.md</code> para documentação detalhada sobre:
              cenários de teste, dados de teste, troubleshooting e integração CI/CD.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard('npx vitest --ui', 'UI interativa do Vitest')}
              variant="secondary"
              size="sm"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Vitest UI
            </Button>
            <Button
              onClick={() => copyToClipboard('npx playwright test --ui', 'UI interativa do Playwright')}
              variant="secondary"
              size="sm"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Playwright UI
            </Button>
            <Button
              onClick={() => copyToClipboard('npx vitest --coverage', 'Relatório de cobertura')}
              variant="secondary"
              size="sm"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Coverage Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Execuções
            </CardTitle>
            <CardDescription>
              Últimas 10 execuções de testes registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {testHistory.map((run) => (
                <AccordionItem key={run.id} value={run.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div className="text-left">
                          <p className="font-medium">{getTestTypeLabel(run.test_type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(run.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(run.status)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-muted/50 rounded-lg p-4 mt-2">
                      <pre className="text-xs overflow-auto max-h-64">
                        {JSON.stringify(run.results, null, 2)}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}