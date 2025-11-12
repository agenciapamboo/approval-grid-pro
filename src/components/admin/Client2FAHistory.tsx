import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Client2FAHistoryProps {
  clientId: string;
  clientName: string;
}

export const Client2FAHistory = ({ clientId, clientName }: Client2FAHistoryProps) => {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    uniqueIPs: 0,
    activeSessions: 0
  });

  useEffect(() => {
    loadSecurityData();
  }, [clientId]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Buscar tentativas de validação relacionadas a este cliente
      const { data: attemptsData } = await supabase
        .from('token_validation_attempts')
        .select(`
          *,
          two_factor_codes!inner(
            client_id,
            identifier,
            identifier_type
          )
        `)
        .eq('two_factor_codes.client_id', clientId)
        .order('attempted_at', { ascending: false })
        .limit(50);

      // Buscar sessões ativas
      const { data: sessionsData } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client_approvers(name, email)
        `)
        .eq('client_id', clientId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (attemptsData) {
        setAttempts(attemptsData);
        
        // Calcular estatísticas
        const successful = attemptsData.filter(a => a.success).length;
        const failed = attemptsData.filter(a => !a.success).length;
        const uniqueIPs = new Set(attemptsData.map(a => a.ip_address)).size;

        setStats({
          totalAttempts: attemptsData.length,
          successfulAttempts: successful,
          failedAttempts: failed,
          uniqueIPs: uniqueIPs,
          activeSessions: sessionsData?.length || 0
        });
      }

      if (sessionsData) {
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de segurança:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Tentativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalAttempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Bem-sucedidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats.successfulAttempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              Falhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.failedAttempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">IPs Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.uniqueIPs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">{stats.activeSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessões Ativas */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sessões Ativas</CardTitle>
            <CardDescription>Aprovadores com sessão ativa neste momento</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aprovador</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Expira em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {session.client_approvers?.name || 'Aprovador Removido'}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {session.client_approvers?.email}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{session.ip_address}</TableCell>
                    <TableCell>{format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{format(new Date(session.expires_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Tentativas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Tentativas de Acesso</CardTitle>
          <CardDescription>Últimas 50 tentativas de autenticação 2FA</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma tentativa de acesso registrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovador</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Bloqueado Até</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <Badge variant={attempt.success ? "default" : "destructive"}>
                        {attempt.success ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sucesso
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Falha
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {attempt.two_factor_codes?.identifier_type === 'email' ? (
                          <span className="text-xs">Email: {attempt.two_factor_codes?.identifier}</span>
                        ) : (
                          <span className="text-xs">Tel: {attempt.two_factor_codes?.identifier}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{attempt.ip_address}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(attempt.attempted_at), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {attempt.blocked_until ? (
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          {format(new Date(attempt.blocked_until), 'dd/MM/yyyy HH:mm')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
