import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import AccessGate from "@/components/auth/AccessGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";

interface LoginAttempt {
  id: string;
  ip_address: string;
  success: boolean;
  attempted_at: string;
  user_agent: string | null;
  token_attempted: string | null;
  blocked_until: string | null;
}

export default function LoginHistory() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('login_validation_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error loading login attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccessGate allow={['super_admin']}>
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-6 w-6" />
                <div>
                  <CardTitle>Histórico de Tentativas de Login 2FA</CardTitle>
                  <CardDescription>Monitoramento de validações de token 2FA</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Bloqueado Até</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          {format(new Date(attempt.attempted_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{attempt.ip_address}</TableCell>
                        <TableCell>
                          {attempt.success ? (
                            <Badge variant="default" className="bg-green-500">Sucesso</Badge>
                          ) : (
                            <Badge variant="destructive">Falhou</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {attempt.user_agent || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {attempt.blocked_until ? (
                            <span className="text-sm text-destructive">
                              {format(new Date(attempt.blocked_until), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {attempts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma tentativa de login registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    </AccessGate>
  );
}
