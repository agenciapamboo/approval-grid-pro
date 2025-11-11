import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Loader2, MessageSquare, ChevronDown, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { triggerWebhook } from "@/lib/webhooks";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

interface CreativeRequest {
  id: string;
  client_id: string;
  agency_id: string;
  event: string;
  status: string;
  created_at: string;
  payload: {
    title: string;
    type: string;
    text: string;
    caption: string;
    observations: string;
    reference_files: string[];
    deadline?: string;
    job_status?: string;
  };
  clients: {
    name: string;
    email: string;
    whatsapp: string;
  };
}

export default function CreativeRequests() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CreativeRequest | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadRequests();
  }, [clientId]);

  const checkAuthAndLoadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Carregar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      await loadRequests();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      navigate("/dashboard");
    }
  };

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

      // Atualizar payload E status da notificação
      const updateData: any = { payload: updatedPayload };
      
      // Se o job está finalizado, atualizar o status da notificação para remover do contador
      if (newStatus === "completed") {
        updateData.status = "sent"; // ou "completed" - qualquer coisa diferente de "pending"
      } else {
        updateData.status = "pending"; // Manter pending para outros status
      }

      const { error } = await supabase
        .from("notifications")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      // Disparar webhook com novo status
      let eventName = `job.${newStatus}`;
      if (newStatus === "pending" && additionalData?.info_request) {
        eventName = "job.info_requested";
      } else if (newStatus === "reviewing") {
        eventName = "job.reviewing";
      } else if (newStatus === "in_production") {
        eventName = "job.in_production";
      } else if (newStatus === "completed") {
        eventName = "job.completed";
      }

      await triggerWebhook(
        eventName,
        request.id,
        request.client_id,
        request.agency_id
      );

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;

    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', requestId)
        .eq('event', 'novojob');

      if (error) throw error;

      toast({
        title: "Solicitação excluída",
        description: "A solicitação criativa foi removida.",
      });

      await loadRequests();
    } catch (error: any) {
      console.error("Erro ao excluir solicitação:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Não foi possível excluir a solicitação.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const mapTypeToContentType = (type: string): 'feed' | 'story' | 'reels' | 'carousel' | 'image' => {
    const typeMap: Record<string, 'feed' | 'story' | 'reels' | 'carousel' | 'image'> = {
      'imagem': 'image',
      'carrossel': 'carousel',
      'reels': 'reels',
      'stories': 'story',
      'outro': 'feed',
    };
    return typeMap[type.toLowerCase()] || 'feed';
  };

  const handleConvertToDraft = async (request: CreativeRequest) => {
    setActionLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = request.payload;
      const deadline = payload.deadline ? new Date(payload.deadline) : null;
      
      // Criar conteúdo em rascunho
      const { data: newContent, error: contentError } = await supabase
        .from('contents')
        .insert([{
          client_id: request.client_id,
          owner_user_id: user.id,
          title: payload.title || 'Sem título',
          type: mapTypeToContentType(payload.type),
          date: deadline?.toISOString() || new Date().toISOString(),
          deadline: deadline?.toISOString(),
          status: 'draft' as const,
          version: 1,
          channels: [],
          category: 'social',
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      // Criar versão da legenda com informações da solicitação
      const captionText = [
        payload.caption,
        payload.text ? `\n\nTexto na arte: ${payload.text}` : '',
        payload.observations ? `\n\nObservações: ${payload.observations}` : '',
      ].filter(Boolean).join('');

      if (captionText) {
        await supabase
          .from('content_texts')
          .insert({
            content_id: newContent.id,
            version: 1,
            caption: captionText,
          });
      }

      // Fazer upload das imagens de referência como mídia do conteúdo
      if (payload.reference_files && payload.reference_files.length > 0) {
        const mediaInserts = payload.reference_files.map((url, index) => ({
          content_id: newContent.id,
          src_url: url,
          kind: 'image' as const,
          order_index: index,
          converted: false,
        }));

        await supabase
          .from('content_media')
          .insert(mediaInserts);
      }

      // Marcar solicitação como concluída
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          payload: {
            ...request.payload,
            job_status: 'completed',
            converted_to_content_id: newContent.id,
          }
        })
        .eq('id', request.id);

      toast({
        title: "✅ Convertido com sucesso!",
        description: "A solicitação foi convertida em um rascunho de conteúdo.",
      });

      await loadRequests();

    } catch (error: any) {
      console.error("Erro ao converter solicitação:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Não foi possível converter a solicitação.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status?: string) => {
    const variants: Record<string, { variant: "default" | "pending" | "destructive" | "success" | "warning", label: string }> = {
      pending: { variant: "warning", label: "Pendente" },
      reviewing: { variant: "pending", label: "Em Revisão" },
      in_production: { variant: "default", label: "Em Produção" },
      completed: { variant: "success", label: "Finalizado" },
    };
    return variants[status || "pending"] || variants.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        userName={profile?.name}
        userRole="Administrador da Agência"
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Solicitações de Criativos</h1>
            <p className="text-muted-foreground">Gerencie as solicitações dos seus clientes</p>
          </div>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma solicitação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => {
              const jobStatus = request.payload?.job_status || "pending";
              const statusConfig = getStatusLabel(jobStatus);

              return (
                <Card key={request.id} className="glass-hover cursor-pointer" onClick={() => {
                  setSelectedRequest(request);
                  setShowDetailsDialog(true);
                }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{request.payload?.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.clients.name}
                        </p>
                      </div>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Tipo:</span> {request.payload?.type}
                      </div>
                      {request.payload?.text && (
                        <div>
                          <span className="font-medium">Texto:</span> {request.payload.text}
                        </div>
                      )}
                      {request.payload?.reference_files?.length > 0 && (
                        <div>
                          <span className="font-medium">Referências:</span> {request.payload.reference_files.length} arquivo(s)
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            Status: {statusConfig.label}
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 z-50">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateJobStatus(request, "pending");
                            }}
                          >
                            Pendente
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateJobStatus(request, "reviewing");
                            }}
                          >
                            Em Revisão
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateJobStatus(request, "in_production");
                            }}
                          >
                            Em Produção
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setShowInfoDialog(true);
                            }}
                          >
                            Dúvidas (+Informações)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateJobStatus(request, "completed");
                            }}
                          >
                            Finalizado
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertToDraft(request);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Converter em Rascunho
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(request.id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Solicitação
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar mais informações</DialogTitle>
            <DialogDescription>
              Envie uma mensagem ao cliente solicitando informações adicionais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Digite sua solicitação..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInfoDialog(false);
                  setInfoMessage("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleRequestInfo} className="flex-1">
                Enviar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Criativo</DialogTitle>
            <DialogDescription>
              Informações completas do briefing solicitado pelo cliente
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Cliente</h3>
                <p className="text-sm">{selectedRequest.clients.name}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.clients.email}</p>
                {selectedRequest.clients.whatsapp && (
                  <p className="text-sm text-muted-foreground">{selectedRequest.clients.whatsapp}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Título</h3>
                <p className="text-sm">{selectedRequest.payload?.title}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Tipo</h3>
                <p className="text-sm">{selectedRequest.payload?.type}</p>
              </div>

              {selectedRequest.payload?.text && (
                <div>
                  <h3 className="font-semibold mb-2">Texto</h3>
                  <p className="text-sm">{selectedRequest.payload.text}</p>
                </div>
              )}

              {selectedRequest.payload?.caption && (
                <div>
                  <h3 className="font-semibold mb-2">Legenda</h3>
                  <p className="text-sm">{selectedRequest.payload.caption}</p>
                </div>
              )}

              {selectedRequest.payload?.observations && (
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm">{selectedRequest.payload.observations}</p>
                </div>
              )}

              {selectedRequest.payload?.reference_files && selectedRequest.payload.reference_files.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Arquivos de Referência</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRequest.payload.reference_files.map((file, index) => (
                      <div key={index} className="border rounded p-2">
                        {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={file} alt={`Referência ${index + 1}`} className="w-full h-32 object-cover rounded" />
                        ) : (
                          <a href={file} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            Ver arquivo {index + 1}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Data da Solicitação</h3>
                <p className="text-sm">{format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Status Atual</h3>
                <Badge variant={getStatusLabel(selectedRequest.payload?.job_status).variant}>
                  {getStatusLabel(selectedRequest.payload?.job_status).label}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </main>
      
      <AppFooter />
    </div>
  );
}
