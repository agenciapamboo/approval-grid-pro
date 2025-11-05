import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContentLog {
  id: string;
  title: string;
  status: string;
  created_at: string;
  submitted_for_review_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  history: Array<{
    type: 'comment' | 'adjustment' | 'rejection';
    text: string;
    created_at: string;
  }>;
}

export default function ClientHistory() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ContentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState<string>("");
  const [sortAscending, setSortAscending] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadClientData();
      loadLogs();
    }
  }, [clientId]);

  const loadClientData = async () => {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    
    if (data) {
      setClientName(data.name);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    
    // Fetch contents
    const { data: contents, error: contentsError } = await supabase
      .from("contents")
      .select("id, title, status, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: sortAscending });

    if (contentsError) {
      console.error("Error loading contents:", contentsError);
      setLoading(false);
      return;
    }

    if (!contents || contents.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const contentIds = contents.map((c) => c.id);

    // Fetch comments (observações e ajustes)
    const { data: comments } = await supabase
      .from("comments")
      .select("content_id, body, adjustment_reason, is_adjustment_request, created_at")
      .in("content_id", contentIds);

    // Fetch activity logs (aprovação, reprovação, envio para revisão)
    const { data: activityLogs } = await supabase
      .from("activity_log")
      .select("entity_id, action, metadata, created_at")
      .eq("entity", "content")
      .in("entity_id", contentIds)
      .in("action", ["approved", "rejected", "submitted_for_review"]);

    // Process and combine data
    const processedLogs: ContentLog[] = contents.map((content) => {
      const contentComments = comments?.filter((c) => c.content_id === content.id) || [];
      const contentActivity = activityLogs?.filter((a) => a.entity_id === content.id) || [];

      const history: ContentLog["history"] = [];

      // Add comments
      contentComments.forEach((comment) => {
        if (comment.is_adjustment_request) {
          history.push({
            type: 'adjustment',
            text: `Solicitação de ajuste: ${comment.adjustment_reason || ''}\n${comment.body}`,
            created_at: comment.created_at,
          });
        } else {
          history.push({
            type: 'comment',
            text: comment.body,
            created_at: comment.created_at,
          });
        }
      });

      // Find dates from activity logs
      const submittedLog = contentActivity.find((a) => a.action === "submitted_for_review");
      const approvedLog = contentActivity.find((a) => a.action === "approved");
      const rejectedLog = contentActivity.find((a) => a.action === "rejected");

      // Add rejection reason to history
      if (rejectedLog && rejectedLog.metadata) {
        const reason = (rejectedLog.metadata as any)?.reason || '';
        if (reason) {
          history.push({
            type: 'rejection',
            text: `Justificativa de reprovação: ${reason}`,
            created_at: rejectedLog.created_at,
          });
        }
      }

      // Sort history by date
      history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return {
        id: content.id,
        title: content.title,
        status: content.status,
        created_at: content.created_at,
        submitted_for_review_at: submittedLog?.created_at || null,
        approved_at: approvedLog?.created_at || null,
        rejected_at: rejectedLog?.created_at || null,
        history,
      };
    });

    setLogs(processedLogs);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "warning" | "destructive" | "outline" | "success" | "pending" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      in_review: { label: "Em Revisão", variant: "pending" },
      approved: { label: "Aprovado", variant: "success" },
      rejected: { label: "Reprovado", variant: "destructive" },
      published: { label: "Publicado", variant: "success" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const toggleSort = () => {
    setSortAscending(!sortAscending);
    loadLogs();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico de Aprovação - {clientName}</CardTitle>
              <Button variant="outline" size="sm" onClick={toggleSort}>
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortAscending ? "Mais antigos primeiro" : "Mais recentes primeiro"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground p-8">
                Nenhum log encontrado para este cliente.
              </p>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Envio</TableHead>
                      <TableHead>Data de Aprovação</TableHead>
                      <TableHead>Data de Reprovação</TableHead>
                      <TableHead className="min-w-[300px]">Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.title}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{formatDate(log.submitted_for_review_at)}</TableCell>
                        <TableCell>{formatDate(log.approved_at)}</TableCell>
                        <TableCell>{formatDate(log.rejected_at)}</TableCell>
                        <TableCell>
                          {log.history.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="space-y-2">
                              {log.history.map((item, idx) => (
                                <div key={idx} className="text-sm">
                                  <Badge
                                    variant={
                                      item.type === 'adjustment'
                                        ? 'warning'
                                        : item.type === 'rejection'
                                        ? 'destructive'
                                        : 'default'
                                    }
                                    className="mb-1"
                                  >
                                    {formatDate(item.created_at)}
                                  </Badge>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{item.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
