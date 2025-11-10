import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kanban";
import { DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DropAnimation } from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Calendar, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestCard } from "./RequestCard";
import { RequestDetailsDialog } from "./RequestDetailsDialog";

interface Content {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  client_id: string;
  owner_user_id: string;
  clients?: {
    name: string;
  };
  profiles?: {
    name: string;
  };
}

interface KanbanColumn {
  id: string;
  column_id: string;
  column_name: string;
  column_color: string;
  column_order: number;
  is_system: boolean;
}

interface CreativeRequestData {
  id: string;
  type: 'creative_request';
  title: string;
  clientName: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  createdAt: string;
  status?: string;
  requestType?: string;
  text?: string;
  caption?: string;
  observations?: string;
  referenceFiles?: string[];
}

interface AdjustmentRequestData {
  id: string;
  type: 'adjustment_request';
  title: string;
  clientName: string;
  createdAt: string;
  contentTitle: string;
  reason: string;
  details: string;
  version: number;
}

interface ContentKanbanProps {
  agencyId: string;
}

export function ContentKanban({ agencyId }: ContentKanbanProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<(CreativeRequestData | AdjustmentRequestData)[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<{
    type: 'creative_request' | 'adjustment_request';
    data: any;
  } | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingForReview, setSendingForReview] = useState<string | null>(null);

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  useEffect(() => {
    loadColumns();
    loadContents();
    loadRequests();
    
    // Realtime updates para colunas
    const columnsChannel = supabase
      .channel('kanban-columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `agency_id=eq.${agencyId}`
        },
        () => {
          loadColumns();
        }
      )
      .subscribe();

    // Realtime updates para conteúdos
    const contentsChannel = supabase
      .channel('contents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contents'
        },
        () => {
          loadContents();
        }
      )
      .subscribe();

    // Realtime updates para notificações (creative requests)
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `agency_id=eq.${agencyId}`
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    // Realtime updates para comentários (adjustment requests)
    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(columnsChannel);
      supabase.removeChannel(contentsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [agencyId]);

  const loadColumns = async () => {
    try {
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        .eq("agency_id", agencyId)
        .order("column_order", { ascending: true });

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error("Erro ao carregar colunas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as colunas do Kanban.",
      });
    }
  };

  const loadContents = async () => {
    try {
      setLoading(true);
      
      // Buscar clientes da agência
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        setContents([]);
        setLoading(false);
        return;
      }

      const clientIds = clients.map((c) => c.id);

      // Buscar conteúdos dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const now = new Date();

      const { data, error } = await supabase
        .from("contents")
        .select(`
          id,
          title,
          date,
          status,
          type,
          client_id,
          owner_user_id,
          clients (name)
        `)
        .in("client_id", clientIds)
        .gte("date", thirtyDaysAgo.toISOString())
        .order("date", { ascending: true });

      if (error) throw error;

      // Buscar informações dos donos
      if (data && data.length > 0) {
        const ownerIds = [...new Set(data.map((c) => c.owner_user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", ownerIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // Filtrar conteúdos aprovados com data passada
        const enrichedContents = data
          .filter(content => {
            if (content.status === 'approved' && new Date(content.date) < now) {
              return false; // Não mostrar aprovados com data passada
            }
            return true;
          })
          .map((content) => ({
            ...content,
            profiles: profileMap.get(content.owner_user_id),
          }));

        setContents(enrichedContents as Content[]);
      } else {
        setContents([]);
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os conteúdos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      // Buscar clientes da agência
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email, whatsapp")
        .eq("agency_id", agencyId);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        setRequests([]);
        return;
      }

      const clientIds = clients.map((c) => c.id);
      const clientMap = new Map(clients.map((c) => [c.id, c]));

      // Buscar creative requests (notifications com event=novojob)
      const { data: creativeNotifications, error: creativeError } = await supabase
        .from("notifications")
        .select("*")
        .eq("event", "novojob")
        .eq("agency_id", agencyId)
        .in("client_id", clientIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (creativeError) throw creativeError;

      const creativeRequests: CreativeRequestData[] = (creativeNotifications || []).map((notif: any) => {
        const client = clientMap.get(notif.client_id);
        return {
          id: notif.id,
          type: 'creative_request' as const,
          title: notif.payload?.title || 'Sem título',
          clientName: client?.name || 'Cliente',
          clientEmail: client?.email,
          clientWhatsapp: client?.whatsapp,
          createdAt: notif.created_at,
          status: notif.payload?.job_status || 'pending',
          requestType: notif.payload?.type,
          text: notif.payload?.text,
          caption: notif.payload?.caption,
          observations: notif.payload?.observations,
          referenceFiles: notif.payload?.reference_files || [],
        };
      });

      // Buscar adjustment requests (comments com is_adjustment_request=true nos últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contentsList } = await supabase
        .from("contents")
        .select("id, title, client_id")
        .in("client_id", clientIds)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (contentsList && contentsList.length > 0) {
        const contentIds = contentsList.map((c) => c.id);
        const contentMap = new Map(contentsList.map((c) => [c.id, c]));

        const { data: adjustmentComments, error: adjustmentError } = await supabase
          .from("comments")
          .select("*")
          .in("content_id", contentIds)
          .eq("is_adjustment_request", true)
          .order("created_at", { ascending: false });

        if (!adjustmentError && adjustmentComments) {
          const adjustmentRequests: AdjustmentRequestData[] = adjustmentComments.map((comment: any) => {
            const content = contentMap.get(comment.content_id);
            const client = clientMap.get(content?.client_id);
            return {
              id: comment.id,
              type: 'adjustment_request' as const,
              title: `Ajuste: ${content?.title || 'Conteúdo'}`,
              clientName: client?.name || 'Cliente',
              createdAt: comment.created_at,
              contentTitle: content?.title || 'Sem título',
              reason: comment.adjustment_reason || 'Não especificado',
              details: comment.body || '',
              version: comment.version || 1,
            };
          });

          setRequests([...creativeRequests, ...adjustmentRequests]);
        } else {
          setRequests(creativeRequests);
        }
      } else {
        setRequests(creativeRequests);
      }
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDragging(false);

    if (!over) return;

    const newStatus = over.id as string;
    const contentId = active.id as string;

    // Mapear column_id para status do banco
    // column_id pode ser: 'draft', 'in_review', 'scheduled' (approved), ou custom_*
    let actualStatus = newStatus;
    
    // Se for 'scheduled', mapear para 'approved'
    if (newStatus === 'scheduled') {
      actualStatus = 'approved';
    }
    
    // Se for coluna customizada, manter como draft (pode ser expandido futuramente)
    if (newStatus.startsWith('custom_')) {
      actualStatus = 'draft';
    }

    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: actualStatus as "draft" | "in_review" | "approved" | "changes_requested" })
        .eq("id", contentId);

      if (error) throw error;

      setContents((prev) =>
        prev.map((content) =>
          content.id === contentId
            ? { ...content, status: actualStatus }
            : content
        )
      );

      toast({
        title: "Status atualizado",
        description: "O status do conteúdo foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status.",
      });
    }
  };

  const activeContent = activeId ? contents.find(c => c.id === activeId) : null;

  const handleSendForReview = async (contentId: string, contentTitle: string) => {
    try {
      setSendingForReview(contentId);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke(
        "send-for-review",
        {
          body: { content_id: contentId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error("Erro da função:", error);
        throw new Error(error.message || "Falha ao enviar para revisão");
      }

      toast({
        title: "Enviado para revisão",
        description: `"${contentTitle}" foi enviado para aprovação do cliente`,
      });

      // Recarregar conteúdos para refletir a mudança
      loadContents();
    } catch (error: any) {
      console.error("Erro ao enviar para revisão:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error.message || "Ocorreu um erro inesperado",
      });
    } finally {
      setSendingForReview(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Kanban de Conteúdos</CardTitle>
            <CardDescription>
              Gerencie o workflow dos últimos 30 dias arrastando os cards
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadColumns();
              loadContents();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto kanban-scroll">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : columns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma coluna configurada. Use o botão "Configurar Colunas" para criar suas colunas.
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum conteúdo nos últimos 30 dias.
          </div>
        ) : (
          <div className="min-w-max pb-4">
            <KanbanProvider onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
              {columns.map((column) => {
                // Mapear column_id para status do banco
                let statusFilter = column.column_id;
                if (column.column_id === 'scheduled') {
                  statusFilter = 'approved'; // "Agendado" mostra conteúdos aprovados
                }
                
                // Coluna de solicitações
                if (column.column_id === 'requests') {
                  return (
                    <KanbanBoard 
                      key={column.column_id} 
                      id={column.column_id}
                      className="w-80"
                    >
                      <KanbanHeader 
                        name={column.column_name} 
                        color={column.column_color} 
                      />
                      <KanbanCards>
                        {requests.map((request, index) => (
                          <div key={request.id} className="mb-2">
                            <RequestCard
                              request={{
                                id: request.id,
                                type: request.type,
                                title: request.title,
                                clientName: request.clientName,
                                createdAt: request.createdAt,
                                status: request.type === 'creative_request' ? (request as CreativeRequestData).status : undefined,
                              }}
                              onClick={() => {
                                setSelectedRequest({
                                  type: request.type,
                                  data: request.type === 'creative_request' 
                                    ? {
                                        id: request.id,
                                        clientName: request.clientName,
                                        clientEmail: (request as CreativeRequestData).clientEmail,
                                        clientWhatsapp: (request as CreativeRequestData).clientWhatsapp,
                                        title: request.title,
                                        type: (request as CreativeRequestData).requestType,
                                        text: (request as CreativeRequestData).text,
                                        caption: (request as CreativeRequestData).caption,
                                        observations: (request as CreativeRequestData).observations,
                                        referenceFiles: (request as CreativeRequestData).referenceFiles,
                                        createdAt: request.createdAt,
                                        status: (request as CreativeRequestData).status,
                                      }
                                    : {
                                        id: request.id,
                                        contentTitle: (request as AdjustmentRequestData).contentTitle,
                                        clientName: request.clientName,
                                        reason: (request as AdjustmentRequestData).reason,
                                        details: (request as AdjustmentRequestData).details,
                                        createdAt: request.createdAt,
                                        version: (request as AdjustmentRequestData).version,
                                      }
                                });
                                setShowRequestDialog(true);
                              }}
                            />
                          </div>
                        ))}
                      </KanbanCards>
                    </KanbanBoard>
                  );
                }

                const columnContents = contents.filter((content) => {
                  if (column.column_id === 'scheduled') {
                    // Mostrar apenas aprovados com data futura
                    return content.status === 'approved' && new Date(content.date) > new Date();
                  }
                  return content.status === statusFilter;
                });

                return (
                  <KanbanBoard 
                    key={column.column_id} 
                    id={column.column_id}
                    className="w-80"
                  >
                    <KanbanHeader 
                      name={column.column_name} 
                      color={column.column_color} 
                    />
                    <KanbanCards>
                      {columnContents.map((content, index) => (
                        <KanbanCard
                          key={content.id}
                          id={content.id}
                          name={content.title}
                          parent={column.column_id}
                          index={index}
                          className={`transition-all duration-200 ${
                            isDragging && activeId === content.id 
                              ? 'opacity-40 scale-95' 
                              : 'hover:shadow-lg hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="m-0 font-medium text-sm truncate">
                                  {content.title}
                                </p>
                                <p className="m-0 text-xs text-muted-foreground truncate">
                                  {content.clients?.name}
                                </p>
                              </div>
                              {content.profiles && (
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${content.profiles.name}`} />
                                  <AvatarFallback className="text-xs">
                                    {content.profiles.name?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(content.date), "dd/MM", { locale: ptBR })}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {content.type}
                              </Badge>
                            </div>
                            
                            {/* Botão Enviar para Aprovação (apenas para draft) */}
                            {column.column_id === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 gap-2 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendForReview(content.id, content.title);
                                }}
                                disabled={sendingForReview === content.id}
                              >
                                <Send className="h-3 w-3" />
                                {sendingForReview === content.id ? 'Enviando...' : 'Enviar para Aprovação'}
                              </Button>
                            )}
                          </div>
                        </KanbanCard>
                      ))}
                    </KanbanCards>
                  </KanbanBoard>
                );
              })}
              <DragOverlay dropAnimation={dropAnimation}>
                {activeContent ? (
                  <div className="w-80 bg-card border rounded-lg shadow-2xl p-4 animate-scale-in rotate-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="m-0 font-medium text-sm truncate">
                            {activeContent.title}
                          </p>
                          <p className="m-0 text-xs text-muted-foreground truncate">
                            {activeContent.clients?.name}
                          </p>
                        </div>
                        {activeContent.profiles && (
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeContent.profiles.name}`} />
                            <AvatarFallback className="text-xs">
                              {activeContent.profiles.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(activeContent.date), "dd/MM", { locale: ptBR })}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activeContent.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </KanbanProvider>
          </div>
        )}
      </CardContent>

      <RequestDetailsDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        request={selectedRequest}
      />
    </Card>
  );
}
