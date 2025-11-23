import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageSquare, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AudioRecorder } from "./AudioRecorder";
// triggerWebhook removido - webhooks agora são automáticos via triggers

interface Comment {
  id: string;
  body: string;
  author_user_id: string | null;
  created_at: string;
  is_adjustment_request: boolean;
  adjustment_reason?: string;
  audio_url?: string | null;
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

export function ContentComments({ contentId, onUpdate, showHistory = true }: ContentCommentsProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
    getCurrentUser();
    getClientId();
  }, [contentId]);

  const getClientId = async () => {
    const { data } = await supabase
      .from("contents")
      .select("client_id")
      .eq("id", contentId)
      .single();
    
    if (data) setClientId(data.client_id);
  };

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

        const { data: insertedComment, error } = await supabase
          .from("comments")
          .insert({
            content_id: contentId,
            body: newComment,
            author_user_id: currentUserId,
            version: contentData?.version || 1,
            audio_url: audioUrl,
          })
          .select()
          .single();

        if (error) throw error;

        // Disparar webhook de novo comentário
        if (contentData?.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("agency_id")
            .eq("id", contentData.client_id)
            .single();

          // Webhook agora é disparado automaticamente via trigger do banco
        }

        setNewComment("");
        setAudioUrl(null);
        await loadComments(); // Re-carregar comentários para garantir visibilidade
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
                  {comment.audio_url && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Volume2 className="h-3 w-3" />
                      <span>Transcrição de áudio</span>
                    </div>
                  )}
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
          placeholder="Escreva um comentário ou grave um áudio..."
          rows={3}
          className="resize-none"
        />
        <div className="flex gap-2">
          {clientId && (
            <AudioRecorder 
              clientId={clientId}
              onTranscriptionComplete={(transcription, url) => {
                setNewComment(transcription);
                setAudioUrl(url);
              }}
            />
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Adicionar comentário
          </Button>
        </div>
      </div>
    </div>
  );
}
