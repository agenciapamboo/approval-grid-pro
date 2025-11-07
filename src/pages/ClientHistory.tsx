import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowUpDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentMedia } from "@/components/content/ContentMedia";
import { ContentCaption } from "@/components/content/ContentCaption";

interface ContentLog {
  id: string;
  title: string;
  status: string;
  type: string;
  version: number;
  date: string;
  created_at: string;
  submitted_for_review_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  published_at: string | null;
  thumb_url: string | null;
  thumb_signed_url: string | null;
  is_available: boolean;
  history: Array<{
    action: string;
    details?: string;
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
  const [selectedContent, setSelectedContent] = useState<ContentLog | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);

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
    
    // Fetch contents with all IDs to check availability
    const { data: allContentIds } = await supabase
      .from("contents")
      .select("id")
      .eq("client_id", clientId);

    const availableContentIds = new Set(allContentIds?.map(c => c.id) || []);
    
    // Fetch contents for logs with their first media thumbnail
    const { data: contents, error: contentsError } = await supabase
      .from("contents")
      .select(`
        id, 
        title, 
        status, 
        type, 
        version, 
        date, 
        created_at, 
        published_at,
        content_media!inner(thumb_url)
      `)
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

    // Helper function to generate signed URL
    const getSignedUrl = async (url: string | null): Promise<string | null> => {
      if (!url) return null;

      // Tentar extrair o path do bucket, independente se veio como URL pública antiga ou apenas o caminho
      let filePath = '';
      try {
        if (url.includes('/content-media/')) {
          filePath = url.split('/content-media/')[1];
        } else if (!url.startsWith('http')) {
          filePath = url.replace(/^\//, ''); // remove barra inicial
        }
      } catch {
        filePath = '';
      }

      if (!filePath) return url; // pode ser URL externa

      try {
        const { data, error } = await supabase.storage
          .from('content-media')
          .createSignedUrl(filePath, 3600); // URL válida por 1 hora
        
        if (error) {
          console.error('Erro ao gerar URL assinada:', error, 'para:', filePath);
          return url;
        }
        
        return data.signedUrl;
      } catch (err) {
        console.error('Erro ao processar URL:', err);
        return url;
      }
    };

    // Process and combine data
    const processedLogs: ContentLog[] = [];
    
    for (const content of contents) {
      const contentComments = comments?.filter((c) => c.content_id === content.id) || [];
      const contentActivity = activityLogs?.filter((a) => a.entity_id === content.id) || [];

      const history: ContentLog["history"] = [];

      // Add comments
      contentComments.forEach((comment) => {
        if (comment.is_adjustment_request) {
          history.push({
            action: 'Solicitação de ajuste',
            details: `${comment.adjustment_reason || ''}\n${comment.body}`,
            created_at: comment.created_at,
          });
        } else {
          history.push({
            action: 'Comentário',
            details: comment.body,
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
            action: 'Reprovado',
            details: reason,
            created_at: rejectedLog.created_at,
          });
        }
      }

      // Sort history by date
      history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Get first thumbnail from media array
      const mediaArray = Array.isArray(content.content_media) 
        ? content.content_media 
        : (content.content_media ? [content.content_media] : []);
      const firstThumb = mediaArray.length > 0 ? mediaArray[0].thumb_url : null;
      
      // Generate signed URL for thumbnail
      const signedThumbUrl = await getSignedUrl(firstThumb);

      processedLogs.push({
        id: content.id,
        title: content.title,
        status: content.status,
        type: content.type,
        version: content.version,
        date: content.date,
        created_at: content.created_at,
        submitted_for_review_at: submittedLog?.created_at || null,
        approved_at: approvedLog?.created_at || null,
        rejected_at: rejectedLog?.created_at || null,
        published_at: content.published_at || null,
        thumb_url: firstThumb,
        thumb_signed_url: signedThumbUrl,
        is_available: availableContentIds.has(content.id),
        history,
      });
    }

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

  const handleViewContent = (log: ContentLog) => {
    setSelectedContent(log);
    setShowContentDialog(true);
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
                <TooltipProvider>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead className="w-[180px]">Status</TableHead>
                      <TableHead>Data de envio para aprovação</TableHead>
                      <TableHead className="w-[40%]">Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-2">
                            {log.thumb_signed_url && (
                              <img 
                                src={log.thumb_signed_url} 
                                alt={log.title}
                                className="w-[150px] h-auto rounded object-cover"
                                onError={(e) => {
                                  console.error('Erro ao carregar thumbnail:', log.thumb_url);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            {log.is_available ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleViewContent(log)}
                                    className="flex items-center gap-2 text-primary hover:underline text-left"
                                  >
                                    {log.title}
                                    <Eye className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver detalhes do conteúdo</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{log.title}</span>
                                    <Badge variant="outline" className="text-xs">Indisponível</Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Conteúdo expirado ou removido pela rotatividade do plano</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>
                          {log.history.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="space-y-2">
                              {log.history.map((item, idx) => (
                                <div key={idx} className="text-sm">
                                  <Badge variant="outline" className="mb-1">
                                    {formatDate(item.created_at)}
                                  </Badge>
                                  <p className="font-medium">{item.action}</p>
                                  {item.details && (
                                    <p className="text-muted-foreground whitespace-pre-wrap">{item.details}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </TooltipProvider>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para visualizar conteúdo */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedContent.status)}
                <Badge variant="outline">{selectedContent.type}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">Data de Postagem</p>
                  <p>{formatDate(selectedContent.date)}</p>
                </div>
                {selectedContent.submitted_for_review_at && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Enviado em</p>
                    <p>{formatDate(selectedContent.submitted_for_review_at)}</p>
                  </div>
                )}
                {selectedContent.approved_at && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Aprovado em</p>
                    <p>{formatDate(selectedContent.approved_at)}</p>
                  </div>
                )}
                {selectedContent.published_at && (
                  <div>
                    <p className="font-semibold text-muted-foreground">Publicado em</p>
                    <p>{formatDate(selectedContent.published_at)}</p>
                  </div>
                )}
              </div>

              {/* Mídia */}
              <ContentMedia contentId={selectedContent.id} type={selectedContent.type} />

              {/* Legenda */}
              <ContentCaption contentId={selectedContent.id} version={selectedContent.version} />

              {/* Histórico */}
              {selectedContent.history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Histórico de Atividades</h4>
                  <div className="space-y-2">
                    {selectedContent.history.map((event, idx) => (
                      <div key={idx} className="text-sm bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium">{event.action}</p>
                        <p className="text-muted-foreground text-xs">{formatDate(event.created_at)}</p>
                        {event.details && (
                          <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{event.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
