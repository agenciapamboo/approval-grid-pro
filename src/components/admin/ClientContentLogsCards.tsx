import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContentLog {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  sent_for_review_at?: string;
  approved_at?: string;
  rejected_at?: string;
  caption?: string;
  media?: Array<{
    id: string;
    src_url: string;
    thumb_url: string | null;
    kind: string;
  }>;
  comments: {
    id: string;
    body: string;
    is_adjustment_request: boolean;
    adjustment_reason?: string;
    created_at: string;
  }[];
}

interface ClientContentLogsCardsProps {
  clientId: string;
}

export function ClientContentLogsCards({ clientId }: ClientContentLogsCardsProps) {
  const [logs, setLogs] = useState<ContentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [clientId]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      // Buscar conteúdos com textos e mídias
      const { data: contents, error: contentsError } = await supabase
        .from("contents")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          version,
          content_texts(caption),
          content_media(id, src_url, thumb_url, kind)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (contentsError) throw contentsError;

      // Processar cada conteúdo para buscar comentários e datas
      const logsWithComments = await Promise.all(
        (contents || []).map(async (content: any) => {
          // Buscar comentários
          const { data: comments } = await supabase
            .from("comments")
            .select("*")
            .eq("content_id", content.id)
            .order("created_at", { ascending: true });

          // Buscar datas do activity_log
          const { data: activities } = await supabase
            .from("activity_log")
            .select("*")
            .eq("entity_id", content.id)
            .in("action", ["sent_for_review", "approved", "rejected"])
            .order("created_at", { ascending: false });

          const sent_for_review_at = activities?.find(
            (a) => a.action === "sent_for_review"
          )?.created_at;

          const approved_at = activities?.find(
            (a) => a.action === "approved"
          )?.created_at;

          const rejected_at = activities?.find(
            (a) => a.action === "rejected"
          )?.created_at;

          return {
            ...content,
            caption: content.content_texts?.[0]?.caption || null,
            media: content.content_media || [],
            comments: comments || [],
            sent_for_review_at,
            approved_at,
            rejected_at,
          };
        })
      );

      setLogs(logsWithComments);
    } catch (error) {
      console.error("Error loading content logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { label: "Rascunho", variant: "outline" },
      in_review: { label: "Em Revisão", variant: "warning" },
      approved: { label: "Aprovado", variant: "success" },
      rejected: { label: "Reprovado", variant: "destructive" },
      published: { label: "Publicado", variant: "default" },
    };

    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum histórico de aprovação encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id} className="w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
              <span className="break-words">{log.title}</span>
              {getStatusBadge(log.status)}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Miniatura da Imagem */}
            {log.media?.[0] && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Imagem (Miniatura):</Label>
                <img
                  src={log.media[0].thumb_url || log.media[0].src_url}
                  alt={log.title}
                  className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-md border"
                />
              </div>
            )}

            {/* Legenda */}
            {log.caption && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Legenda:</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {log.caption}
                </p>
              </div>
            )}

            {/* Datas em Grid Responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Enviado Para Revisão */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Enviado Para revisão:</Label>
                <p className="text-sm">
                  {log.sent_for_review_at
                    ? format(new Date(log.sent_for_review_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </p>
              </div>

              {/* Aprovado em */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Aprovado em:</Label>
                <p className="text-sm text-green-600">
                  {log.approved_at
                    ? format(new Date(log.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </p>
              </div>

              {/* Reprovado em */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Reprovado em:</Label>
                <p className="text-sm text-red-600">
                  {log.rejected_at
                    ? format(new Date(log.rejected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"}
                </p>
              </div>
            </div>

            {/* Observações (Comentários Normais) */}
            {log.comments.filter((c) => !c.is_adjustment_request).length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-semibold">Observações:</Label>
                <div className="space-y-3">
                  {log.comments
                    .filter((c) => !c.is_adjustment_request)
                    .map((comment) => (
                      <div key={comment.id} className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm break-words">{comment.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Solicitações de Ajuste */}
            {log.comments.filter((c) => c.is_adjustment_request).length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-semibold">Solicitações de ajuste:</Label>
                <div className="space-y-3">
                  {log.comments
                    .filter((c) => c.is_adjustment_request)
                    .map((adjustment) => (
                      <div
                        key={adjustment.id}
                        className="bg-destructive/10 border border-destructive/20 p-3 rounded-md"
                      >
                        <div className="flex items-start gap-2 mb-2 flex-wrap">
                          <Badge variant="destructive" className="text-xs">
                            Ajuste Solicitado
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(adjustment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm break-words">
                          {adjustment.adjustment_reason || adjustment.body}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
