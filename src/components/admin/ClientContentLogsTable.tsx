import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface ContentLog {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  sent_for_review_at?: string;
  approved_at?: string;
  rejected_at?: string;
  comments: {
    id: string;
    body: string;
    is_adjustment_request: boolean;
    adjustment_reason?: string;
    created_at: string;
    author_user_id: string;
  }[];
}

interface ClientContentLogsTableProps {
  clientId: string;
}

export function ClientContentLogsTable({ clientId }: ClientContentLogsTableProps) {
  const [logs, setLogs] = useState<ContentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [clientId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Buscar conteúdos do cliente
      const { data: contents, error: contentsError } = await supabase
        .from("contents")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (contentsError) throw contentsError;

      // Para cada conteúdo, buscar comentários
      const logsWithComments = await Promise.all(
        (contents || []).map(async (content) => {
          const { data: comments, error: commentsError } = await supabase
            .from("comments")
            .select("id, body, is_adjustment_request, adjustment_reason, created_at, author_user_id")
            .eq("content_id", content.id)
            .order("created_at", { ascending: false });

          if (commentsError) throw commentsError;

          // Buscar datas específicas no activity_log
          const { data: activityLog } = await supabase
            .from("activity_log")
            .select("action, created_at, metadata")
            .eq("entity", "content")
            .eq("entity_id", content.id)
            .in("action", ["sent_for_review", "approved", "rejected"]);

          // Processar datas de eventos
          let sent_for_review_at: string | undefined;
          let approved_at: string | undefined;
          let rejected_at: string | undefined;

          activityLog?.forEach((log) => {
            if (log.action === "sent_for_review") sent_for_review_at = log.created_at;
            if (log.action === "approved") approved_at = log.created_at;
            if (log.action === "rejected") rejected_at = log.created_at;
          });

          return {
            ...content,
            comments: comments || [],
            sent_for_review_at,
            approved_at,
            rejected_at,
          };
        })
      );

      setLogs(logsWithComments);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "pending" | "destructive" | "outline" | "success" }> = {
      draft: { label: "Rascunho", variant: "pending" },
      in_review: { label: "Em Revisão", variant: "default" },
      approved: { label: "Aprovado", variant: "success" },
      published: { label: "Publicado", variant: "outline" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "pending" };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nenhum conteúdo encontrado para este cliente
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviado p/ Revisão</TableHead>
            <TableHead>Aprovado em</TableHead>
            <TableHead>Reprovado em</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Solicitações de Ajuste</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const adjustmentComments = log.comments.filter(c => c.is_adjustment_request);
            const rejectionComments = log.comments.filter(
              c => c.adjustment_reason && c.adjustment_reason.trim() !== ""
            );

            return (
              <TableRow key={log.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {log.title}
                </TableCell>
                <TableCell>{getStatusBadge(log.status)}</TableCell>
                <TableCell className="text-sm">
                  {log.sent_for_review_at 
                    ? format(new Date(log.sent_for_review_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {log.approved_at 
                    ? format(new Date(log.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {log.rejected_at 
                    ? format(new Date(log.rejected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </TableCell>
                <TableCell>
                  {log.comments.length > 0 ? (
                    <div className="space-y-1 max-w-[250px]">
                      {log.comments.map((comment, idx) => (
                        <div key={comment.id} className="text-xs">
                          <p className="truncate">{comment.body}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                          {idx < log.comments.length - 1 && <div className="border-t my-1" />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {adjustmentComments.length > 0 ? (
                    <div className="space-y-1 max-w-[250px]">
                      {adjustmentComments.map((comment, idx) => (
                        <div key={comment.id} className="text-xs">
                          <Badge variant="destructive" className="mb-1">Ajuste</Badge>
                          <p className="truncate">{comment.adjustment_reason || comment.body}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                          {idx < adjustmentComments.length - 1 && <div className="border-t my-1" />}
                        </div>
                      ))}
                    </div>
                  ) : rejectionComments.length > 0 ? (
                    <div className="space-y-1 max-w-[250px]">
                      {rejectionComments.map((comment, idx) => (
                        <div key={comment.id} className="text-xs">
                          <Badge variant="outline" className="mb-1">Reprovação</Badge>
                          <p className="truncate">{comment.adjustment_reason}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                          {idx < rejectionComments.length - 1 && <div className="border-t my-1" />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
