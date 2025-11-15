import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Trash2, FileEdit, MessageSquare, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreativeRequest {
  id: string;
  client_id: string;
  agency_id: string;
  event: string;
  status: string;
  created_at: string;
  payload: any;
  clients?: {
    name: string;
    email?: string;
    whatsapp?: string;
  };
}

interface ClientCreativeRequestsTableProps {
  clientId?: string;
  showClientColumn?: boolean;
}

export function ClientCreativeRequestsTable({ 
  clientId, 
  showClientColumn = false 
}: ClientCreativeRequestsTableProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CreativeRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, [clientId]);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

      if (!profile?.agency_id) return;

      let query = supabase
        .from("notifications")
        .select("*, clients!inner(*)")
        .eq("event", "novojob")
        .eq("agency_id", profile.agency_id)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests((data || []) as any);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as solicitações",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (request: CreativeRequest, newStatus: string, additionalData?: any) => {
    setActionLoading(true);
    try {
      const updatedPayload = {
        ...request.payload,
        job_status: newStatus,
        ...additionalData,
      };

      const updateData: any = { payload: updatedPayload };
      
      if (newStatus === "completed") {
        updateData.status = "sent";
      } else {
        updateData.status = "pending";
      }

      const { error } = await supabase
        .from("notifications")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `O job foi marcado como ${getStatusLabel(newStatus).label}`,
      });

      loadRequests();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedRequest || !infoMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite uma mensagem para solicitar informações",
      });
      return;
    }

    await updateJobStatus(selectedRequest, "pending", { info_request: infoMessage });
    setShowInfoDialog(false);
    setInfoMessage("");
    setSelectedRequest(null);
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Solicitação excluída",
        description: "A solicitação foi removida com sucesso",
      });

      loadRequests();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a solicitação",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToDraft = async (request: CreativeRequest) => {
    if (!confirm("Converter esta solicitação em um rascunho de conteúdo?")) return;

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = request.payload;
      const contentType = mapTypeToContentType(payload.type);

      const { error } = await supabase.from("contents").insert([{
        client_id: request.client_id,
        agency_id: request.agency_id,
        owner_user_id: user.id,
        title: payload.title || "Novo conteúdo",
        type: contentType,
        status: "draft",
        date: payload.deadline || new Date().toISOString(),
        deadline: payload.deadline,
        category: payload.category || "social",
      }]);

      if (error) throw error;

      await updateJobStatus(request, "completed");

      toast({
        title: "Convertido com sucesso",
        description: "A solicitação foi convertida em rascunho",
      });
    } catch (error) {
      console.error("Erro ao converter:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível converter a solicitação",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const mapTypeToContentType = (type: string): "feed" | "story" | "reels" | "carousel" | "image" => {
    const typeMap: Record<string, "feed" | "story" | "reels" | "carousel" | "image"> = {
      "Post Feed": "feed",
      "Stories": "story",
      "Reels": "reels",
      "Carrossel": "carousel",
    };
    return typeMap[type] || "feed";
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "pending" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "pending" },
      reviewing: { label: "Em Análise", variant: "default" },
      in_production: { label: "Em Produção", variant: "default" },
      completed: { label: "Finalizado", variant: "outline" },
    };
    return statusMap[status] || { label: status, variant: "pending" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nenhuma solicitação encontrada
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[500px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              {showClientColumn && <TableHead>Cliente</TableHead>}
              <TableHead>Prazo</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const payload = request.payload || {};
              const jobStatus = payload.job_status || "pending";
              const statusInfo = getStatusLabel(jobStatus);

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {payload.title || "Sem título"}
                  </TableCell>
                  <TableCell>{payload.type || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  {showClientColumn && (
                    <TableCell>{request.clients?.name || "-"}</TableCell>
                  )}
                  <TableCell>
                    {payload.deadline
                      ? format(new Date(payload.deadline), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConvertToDraft(request)}
                        disabled={actionLoading}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowInfoDialog(true);
                        }}
                        disabled={actionLoading}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(request.id)}
                        disabled={actionLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Informações completas sobre a solicitação de criativo
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <p className="text-sm">{selectedRequest.clients?.name}</p>
              </div>
              <div>
                <Label>Título</Label>
                <p className="text-sm">{selectedRequest.payload?.title || "-"}</p>
              </div>
              <div>
                <Label>Tipo</Label>
                <p className="text-sm">{selectedRequest.payload?.type || "-"}</p>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.payload?.description || "-"}</p>
              </div>
              <div>
                <Label>Referências</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.payload?.references || "-"}</p>
              </div>
              {selectedRequest.payload?.info_request && (
                <div>
                  <Label>Solicitação de Informações</Label>
                  <p className="text-sm text-orange-600">{selectedRequest.payload.info_request}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Solicitar Informações */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Mais Informações</DialogTitle>
            <DialogDescription>
              Envie uma mensagem ao cliente pedindo mais detalhes sobre esta solicitação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="info-message">Mensagem</Label>
              <Textarea
                id="info-message"
                placeholder="Digite sua mensagem aqui..."
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestInfo} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
