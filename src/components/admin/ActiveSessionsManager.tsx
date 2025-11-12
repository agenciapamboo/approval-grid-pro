import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  LogOut, 
  Clock, 
  Globe, 
  User, 
  Building2,
  RefreshCw,
  Search
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionWithDetails {
  id: string;
  session_token: string;
  approver_id: string;
  client_id: string;
  expires_at: string;
  last_activity: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  approver_name: string;
  approver_email: string;
  client_name: string;
  client_slug: string;
}

export function ActiveSessionsManager() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [terminatingSession, setTerminatingSession] = useState<SessionWithDetails | null>(null);
  const { toast } = useToast();

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      // Buscar sessões ativas com joins
      const { data, error } = await supabase
        .from("client_sessions")
        .select(`
          id,
          session_token,
          approver_id,
          client_id,
          expires_at,
          last_activity,
          created_at,
          ip_address,
          user_agent,
          client_approvers!inner (
            name,
            email
          ),
          clients!inner (
            name,
            slug
          )
        `)
        .gt("expires_at", new Date().toISOString())
        .order("last_activity", { ascending: false });

      if (error) throw error;

      // Transformar dados para o formato esperado
      const transformedData: SessionWithDetails[] = (data || []).map((session: any) => ({
        id: session.id,
        session_token: session.session_token,
        approver_id: session.approver_id,
        client_id: session.client_id,
        expires_at: session.expires_at,
        last_activity: session.last_activity,
        created_at: session.created_at,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        approver_name: session.client_approvers.name,
        approver_email: session.client_approvers.email,
        client_name: session.clients.name,
        client_slug: session.clients.slug,
      }));

      setSessions(transformedData);
      setFilteredSessions(transformedData);
    } catch (error: any) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Erro ao carregar sessões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = sessions.filter(
      (session) =>
        session.approver_name.toLowerCase().includes(term) ||
        session.approver_email.toLowerCase().includes(term) ||
        session.client_name.toLowerCase().includes(term) ||
        session.client_slug.toLowerCase().includes(term) ||
        session.ip_address?.toLowerCase().includes(term)
    );
    setFilteredSessions(filtered);
  }, [searchTerm, sessions]);

  const handleTerminateSession = async () => {
    if (!terminatingSession) return;

    try {
      // Expirar a sessão imediatamente
      const { error } = await supabase
        .from("client_sessions")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", terminatingSession.id);

      if (error) throw error;

      toast({
        title: "Sessão encerrada",
        description: `Sessão de ${terminatingSession.approver_name} foi encerrada com sucesso.`,
      });

      loadSessions();
    } catch (error: any) {
      console.error("Error terminating session:", error);
      toast({
        title: "Erro ao encerrar sessão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTerminatingSession(null);
    }
  };

  const getBrowserFromUserAgent = (userAgent: string | null): string => {
    if (!userAgent) return "Desconhecido";
    
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    
    return "Outro";
  };

  const getActivityStatus = (lastActivity: string): { text: string; variant: "default" | "success" | "outline" } => {
    const now = new Date();
    const lastActivityDate = new Date(lastActivity);
    const diffMinutes = Math.floor((now.getTime() - lastActivityDate.getTime()) / 1000 / 60);

    if (diffMinutes < 5) return { text: "Ativo agora", variant: "success" };
    if (diffMinutes < 30) return { text: "Ativo recentemente", variant: "default" };
    return { text: "Inativo", variant: "outline" };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sessões 2FA Ativas
              </CardTitle>
              <CardDescription>
                Monitoramento de todas as sessões de aprovação ativas
              </CardDescription>
            </div>
            <Button onClick={loadSessions} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aprovador, cliente ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando sessões...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhuma sessão encontrada com este filtro" : "Nenhuma sessão ativa no momento"}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {filteredSessions.length} sessão(ões) ativa(s)
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aprovador</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => {
                    const activityStatus = getActivityStatus(session.last_activity);
                    
                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{session.approver_name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{session.approver_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">{session.client_name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{session.client_slug}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {session.ip_address && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground font-mono">{session.ip_address}</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {getBrowserFromUserAgent(session.user_agent)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Badge variant={activityStatus.variant} className="w-fit">
                              {activityStatus.text}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(session.last_activity), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTerminatingSession(session)}
                          >
                            <LogOut className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!terminatingSession} onOpenChange={(open) => !open && setTerminatingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar a sessão de <strong>{terminatingSession?.approver_name}</strong>?
              Eles precisarão fazer login novamente com código 2FA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminateSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Encerrar Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
