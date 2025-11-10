import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, RefreshCw, Filter, FileText, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AuditLog {
  id: string;
  entity: string;
  action: string;
  entity_id: string;
  actor_user_id: string | null;
  metadata: any;
  created_at: string;
  actor_email?: string;
  actor_name?: string;
  user_email?: string;
  user_name?: string;
}

export function UserAuditLog() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch audit logs
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['user-audit-logs', startDate, endDate, actionFilter, actorFilter],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('entity', 'user')
        .order('created_at', { ascending: false })
        .limit(500);

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (actorFilter !== 'all') {
        query = query.eq('actor_user_id', actorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with user emails and names
      const enrichedLogs = await Promise.all(
        (data || []).map(async (log) => {
          let actorEmail = null;
          let actorName = null;
          let userEmail = null;
          let userName = null;

          // Get actor info
          if (log.actor_user_id) {
            const { data: actorProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', log.actor_user_id)
              .single();

            const { data: orphanedData } = await supabase.functions.invoke('list-orphaned-accounts');
            const actorAuth = orphanedData?.all_auth_users?.find((u: any) => u.id === log.actor_user_id);
            
            actorEmail = actorAuth?.email;
            actorName = actorProfile?.name;
          }

          // Get user info (entity)
          if (log.entity_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', log.entity_id)
              .single();

            const { data: orphanedData } = await supabase.functions.invoke('list-orphaned-accounts');
            const userAuth = orphanedData?.all_auth_users?.find((u: any) => u.id === log.entity_id);
            
            userEmail = userAuth?.email;
            userName = userProfile?.name;
          }

          return {
            ...log,
            actorEmail,
            actorName,
            userEmail,
            userName
          };
        })
      );

      return enrichedLogs;
    }
  });

  // Get unique actors for filter
  const { data: actors = [] } = useQuery({
    queryKey: ['audit-actors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('actor_user_id')
        .eq('entity', 'user')
        .not('actor_user_id', 'is', null);

      if (error) throw error;

      const uniqueActorIds = [...new Set(data.map(log => log.actor_user_id))];
      
      // Get emails for actors
      const { data: orphanedData } = await supabase.functions.invoke('list-orphaned-accounts');
      const allUsers = orphanedData?.all_auth_users || [];

      return uniqueActorIds.map(id => {
        const user = allUsers.find((u: any) => u.id === id);
        return {
          id,
          email: user?.email || 'Desconhecido'
        };
      });
    }
  });

  // Filter logs by search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.userEmail?.toLowerCase().includes(term) ||
      log.userName?.toLowerCase().includes(term) ||
      log.actorEmail?.toLowerCase().includes(term) ||
      log.actorName?.toLowerCase().includes(term) ||
      log.entity_id?.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'profile_created':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Criado</Badge>;
      case 'profile_updated':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Atualizado</Badge>;
      case 'profile_creation_failed':
        return <Badge variant="destructive">Falha na Criação</Badge>;
      case 'profile_deleted':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Excluído</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const renderMetadataChanges = (metadata: any) => {
    if (!metadata) return null;

    const { updates, previous } = metadata;
    if (!updates && !previous) {
      return <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(metadata, null, 2)}</pre>;
    }

    return (
      <div className="space-y-2">
        {updates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(updates).map(key => (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-semibold">{key}</Label>
                <div className="flex gap-2 items-center text-sm">
                  <div className="flex-1 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                    <span className="text-xs text-muted-foreground">Antes:</span>
                    <div className="font-mono text-xs break-all">
                      {previous?.[key] !== undefined ? String(previous[key]) : 'N/A'}
                    </div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex-1 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                    <span className="text-xs text-muted-foreground">Depois:</span>
                    <div className="font-mono text-xs break-all">
                      {String(updates[key])}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auditoria de Usuários
              </CardTitle>
              <CardDescription>
                Histórico completo de todas as ações realizadas em usuários do sistema
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Inicial
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Final
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label htmlFor="action-filter" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Tipo de Ação
              </Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="profile_created">Criação</SelectItem>
                  <SelectItem value="profile_updated">Atualização</SelectItem>
                  <SelectItem value="profile_deleted">Exclusão</SelectItem>
                  <SelectItem value="profile_creation_failed">Falhas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actor Filter */}
            <div className="space-y-2">
              <Label htmlFor="actor-filter" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Admin Responsável
              </Label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger id="actor-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os admins</SelectItem>
                  {actors.map(actor => (
                    <SelectItem key={actor.id} value={actor.id}>
                      {actor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar nos logs</Label>
            <Input
              id="search"
              placeholder="Buscar por email, nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filteredLogs.length} registro(s) encontrado(s)</span>
              {(startDate || endDate || actionFilter !== 'all' || actorFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setActionFilter("all");
                    setActorFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {filteredLogs.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {searchTerm || startDate || endDate || actionFilter !== 'all' || actorFilter !== 'all'
                    ? "Nenhum log encontrado com os filtros aplicados."
                    : "Nenhum log de auditoria disponível."}
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <Collapsible key={log.id}>
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="space-y-2 flex-1 min-w-0">
                                  {/* Header */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getActionBadge(log.action)}
                                    <span className="text-sm font-medium">
                                      {log.userName || log.userEmail || 'Usuário desconhecido'}
                                    </span>
                                  </div>

                                  {/* Details */}
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div>
                                      👤 Usuário: <span className="font-mono text-xs">{log.userEmail}</span>
                                    </div>
                                    {log.actorEmail && (
                                      <div>
                                        🔑 Admin: {log.actorName && <span className="font-medium">{log.actorName}</span>} ({log.actorEmail})
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span>📅 {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t bg-muted/30 p-4 space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground">DETALHES DA MUDANÇA</div>
                            {renderMetadataChanges(log.metadata)}
                            <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
                              Log ID: {log.id}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
