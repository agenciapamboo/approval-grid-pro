import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PlayCircle, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
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

export function TestRunner() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
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
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de testes.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const runTests = async (testType: 'unit' | 'e2e' | 'coverage') => {
    setIsRunning(true);
    setCurrentTest(testType);

    try {
      const { data, error } = await supabase.functions.invoke('run-tests', {
        body: { testType },
      });

      if (error) throw error;

      toast({
        title: "Testes concluídos",
        description: `Testes ${testType} finalizados com status: ${data.status}`,
        variant: data.status === 'passed' ? "default" : "destructive",
      });

      await loadTestHistory();
    } catch (error: any) {
      console.error('Error running tests:', error);
      toast({
        title: "Erro ao executar testes",
        description: error.message || "Ocorreu um erro ao executar os testes.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
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
      running: "pending",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Executar Testes
          </CardTitle>
          <CardDescription>
            Execute testes unitários, E2E ou análise de cobertura de código
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              onClick={() => runTests('unit')}
              disabled={isRunning}
              className="h-24 flex-col gap-2"
            >
              {isRunning && currentTest === 'unit' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
              <span className="text-sm font-medium">Testes Unitários</span>
              <span className="text-xs opacity-80">Vitest</span>
            </Button>

            <Button
              onClick={() => runTests('e2e')}
              disabled={isRunning}
              className="h-24 flex-col gap-2"
            >
              {isRunning && currentTest === 'e2e' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
              <span className="text-sm font-medium">Testes E2E</span>
              <span className="text-xs opacity-80">Playwright</span>
            </Button>

            <Button
              onClick={() => runTests('coverage')}
              disabled={isRunning}
              className="h-24 flex-col gap-2"
            >
              {isRunning && currentTest === 'coverage' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PlayCircle className="h-6 w-6" />
              )}
              <span className="text-sm font-medium">Cobertura</span>
              <span className="text-xs opacity-80">Coverage Report</span>
            </Button>
          </div>

          {isRunning && (
            <Alert className="mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Executando {getTestTypeLabel(currentTest || '')}... Isso pode levar alguns minutos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Execuções
          </CardTitle>
          <CardDescription>
            Últimas 10 execuções de testes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : testHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma execução de teste encontrada
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}