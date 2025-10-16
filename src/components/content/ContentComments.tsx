import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  body: string;
  author_user_id: string;
  created_at: string;
  is_adjustment_request: boolean;
  adjustment_reason?: string;
  profiles?: {
    name: string;
  };
}

interface ContentCommentsProps {
  contentId: string;
  onUpdate: () => void;
}

export function ContentComments({ contentId, onUpdate }: ContentCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadComments();
    getCurrentUser();
  }, [contentId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles:author_user_id (name)
      `)
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data as any);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      // Pegar a versão atual do conteúdo
      const { data: contentData } = await supabase
        .from("contents")
        .select("version")
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

      setNewComment("");
      loadComments();
      onUpdate();
      
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
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
    } catch (error) {
      console.error("Erro ao remover comentário:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover comentário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
      {/* Lista de comentários */}
      <div className="space-y-3">
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
                    {comment.profiles?.name || "Usuário"}
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
              {comment.author_user_id === currentUserId && (
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

      {/* Novo comentário */}
      <div className="space-y-2 pt-2 border-t">
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
          className="self-end"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Adicionar comentário
        </Button>
      </div>
    </div>
  );
}
