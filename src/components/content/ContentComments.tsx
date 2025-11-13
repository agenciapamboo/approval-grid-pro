import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { triggerWebhook } from "@/lib/webhooks";

interface Comment {
  id: string;
  body: string;
  author_user_id: string | null;
  created_at: string;
  is_adjustment_request: boolean;
  adjustment_reason?: string;
  profiles?: {
    name: string;
  } | null;
}

interface ContentCommentsProps {
  contentId: string;
  onUpdate: () => void;
  showHistory?: boolean;
  approvalToken?: string;
}

export function ContentComments({ contentId, onUpdate, showHistory = true, approvalToken }: ContentCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadComments();
    if (!approvalToken) {
      getCurrentUser();
    }
  }, [contentId, approvalToken]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadComments = async () => {
    try {
      // Modo autenticado: SELECT normal
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:author_user_id (
            name
          )
        `)
        .eq("content_id", contentId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data as any);
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao carregar histórico"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      // Fluxo autenticado normal
      const { data: contentData } = await supabase
        .from("contents")
        .select("version, client_id")
        .eq("id", contentId)
        .single();

        const { error } = await supabase
          .from("comments")
          .insert({
            content_id: contentId,
            body: newComment,
            author_user_id: currentUserId,
            version: contentData?.version || 1,
          });

        if (error) throw error;

        // Disparar webhook de novo comentário
        if (contentData?.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("agency_id")
            .eq("id", contentData.client_id)
            .single();

          await triggerWebhook(
            "comentario",
            contentId,
            contentData.client_id,
            clientData?.agency_id
          );
        }

        setNewComment("");
        loadComments();
        onUpdate();
        
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao adicionar comentário",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      loadComments();
      toast({
        title: "Comentário removido",
        description: "O comentário foi removido com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao remover comentário:", error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao remover comentário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Lista de comentários */}
      {showHistory && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className={`p-3 rounded-lg ${
                comment.is_adjustment_request 
                  ? "bg-destructive/10 border border-destructive/20" 
                  : "bg-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.profiles?.name || (comment.author_user_id ? "Usuário" : "Cliente (via aprovação)")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {comment.is_adjustment_request && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                        Ajuste solicitado
                      </span>
                    )}
                  </div>
                  {comment.adjustment_reason && (
                    <p className="text-sm font-medium text-destructive mb-1">
                      {comment.adjustment_reason}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
                </div>
                {currentUserId && comment.author_user_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Novo comentário */}
      <div className={`space-y-2 ${showHistory ? 'pt-2 border-t' : ''}`}>
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={3}
          className="resize-none"
        />
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Adicionar comentário
        </Button>
      </div>
    </div>
  );
}
