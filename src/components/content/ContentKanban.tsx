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
import { Eye, Calendar } from "lucide-react";
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

interface ContentKanbanProps {
  agencyId: string;
}

const contentStatuses = [
  { id: "draft", name: "Rascunho", color: "#6B7280" },
  { id: "in_review", name: "Em Revisão", color: "#F59E0B" },
  { id: "approved", name: "Aprovado", color: "#10B981" },
  { id: "published", name: "Publicado", color: "#3B82F6" },
];

export function ContentKanban({ agencyId }: ContentKanbanProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContents();
  }, [agencyId]);

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
        return;
      }

      const clientIds = clients.map((c) => c.id);

      // Buscar conteúdos dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

        const enrichedContents = data.map((content) => ({
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

    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: newStatus as "draft" | "in_review" | "approved" | "changes_requested" })
        .eq("id", contentId);

      if (error) throw error;

      setContents((prev) =>
        prev.map((content) =>
          content.id === contentId
            ? { ...content, status: newStatus }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kanban de Conteúdos</CardTitle>
        <CardDescription>
          Gerencie o workflow dos últimos 30 dias arrastando os cards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum conteúdo nos últimos 30 dias.
          </div>
        ) : (
          <KanbanProvider onDragEnd={handleDragEnd}>
            {contentStatuses.map((status) => (
              <KanbanBoard key={status.id} id={status.id}>
                <KanbanHeader name={status.name} color={status.color} />
                <KanbanCards>
                  {contents
                    .filter((content) => content.status === status.id)
                    .map((content, index) => (
                      <KanbanCard
                        key={content.id}
                        id={content.id}
                        name={content.title}
                        parent={status.id}
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
            ))}
          </KanbanProvider>
        )}
      </CardContent>
    </Card>
  );
}
