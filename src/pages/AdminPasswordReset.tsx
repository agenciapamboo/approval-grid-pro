import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AdminPasswordReset() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleResetAllPasswords = async () => {
    if (!confirm("Tem certeza que deseja redefinir a senha de TODOS os usuários para 'D024m002*'? Esta ação não pode ser desfeita.")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('force-reset-all-passwords', {
        headers: {
          'X-Admin-Token': 'Aprovatokenm002'
        }
      });

      if (error) {
        console.error('Error resetting passwords:', error);
        toast.error('Erro ao redefinir senhas');
        return;
      }

      setResult(data);
      toast.success(`Senhas redefinidas com sucesso! ${data.success} usuários atualizados.`);
    } catch (error: any) {
      console.error('Exception resetting passwords:', error);
      toast.error('Erro ao executar reset de senhas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset de Senhas - Administração</CardTitle>
          <CardDescription>
            Redefine a senha de todos os usuários do sistema para a senha padrão: <strong>D024m002*</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>ATENÇÃO:</strong> Esta ação irá redefinir a senha de TODOS os usuários do sistema. 
              Use com extrema cautela!
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleResetAllPasswords}
            disabled={loading}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando Reset...
              </>
            ) : (
              "Executar Reset de Todas as Senhas"
            )}
          </Button>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Resultado da Operação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Total de usuários:</strong> {result.total}</p>
                <p className="text-green-600"><strong>Sucesso:</strong> {result.success}</p>
                <p className="text-red-600"><strong>Falhas:</strong> {result.failed}</p>

                {result.results?.success?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2">Usuários atualizados com sucesso:</p>
                    <ul className="list-disc list-inside text-sm">
                      {result.results.success.map((email: string, idx: number) => (
                        <li key={idx}>{email}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.results?.failed?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2 text-red-600">Falhas:</p>
                    <ul className="list-disc list-inside text-sm">
                      {result.results.failed.map((item: any, idx: number) => (
                        <li key={idx}>{item.email}: {item.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
