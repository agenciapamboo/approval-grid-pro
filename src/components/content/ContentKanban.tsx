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
import type { DragEndEvent } from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface ContentKanbanProps {
  agencyId: string;
}

export function ContentKanban({ agencyId }: ContentKanbanProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColumns();
    loadContents();
    
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

    return () => {
      supabase.removeChannel(columnsChannel);
      supabase.removeChannel(contentsChannel);
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

      // Buscar conteúdos dos últimos 30 dias, excluindo publicados e arquivados
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
        .not("status", "in", '("published","archived")')
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

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
            <KanbanProvider onDragEnd={handleDragEnd}>
              {columns.map((column) => {
                // Mapear column_id para status do banco
                let statusFilter = column.column_id;
                if (column.column_id === 'scheduled') {
                  statusFilter = 'approved'; // "Agendado" mostra conteúdos aprovados
                }
                if (column.column_id === 'requests') {
                  // Coluna de solicitações (será implementada depois)
                  return null;
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
                          </div>
                        </KanbanCard>
                      ))}
                    </KanbanCards>
                  </KanbanBoard>
                );
              })}
            </KanbanProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
