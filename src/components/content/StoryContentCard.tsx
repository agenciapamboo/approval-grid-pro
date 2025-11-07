import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, AlertCircle, MoreVertical, Trash2, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";

interface StoryContentCardProps {
  content: {
    id: string;
    title: string;
    date: string;
    type: string;
    status: string;
    version: number;
    channels?: string[];
    auto_publish?: boolean;
  };
  media: Array<{
    id: string;
    src_url: string;
    kind: string;
    thumb_url?: string;
  }>;
  isResponsible: boolean;
  isAgencyView?: boolean;
  onUpdate: () => void;
}

export function StoryContentCard({ content, media, isResponsible, isAgencyView = false, onUpdate }: StoryContentCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; classes: string }> = {
      draft: { label: "Rascunho", classes: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
      in_review: { label: "Em Revisão", classes: "bg-[hsl(var(--accent))] text-white" },
      changes_requested: { label: "Ajustes Solicitados", classes: "bg-[hsl(var(--warning))] text-white" },
      approved: { label: "Aprovado", classes: "bg-[hsl(var(--success))] text-white" },
    };
    const cfg = map[status] || { label: status, classes: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]" };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>{cfg.label}</span>;
  };

  const handleApprove = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateErr } = await supabase
        .from("contents")
        .update({ status: "approved" })
        .eq("id", content.id);
      if (updateErr) throw updateErr;

      const timestamp = new Date().toLocaleString('pt-BR');
      await supabase.from('comments').insert({
        content_id: content.id,
        version: content.version,
        author_user_id: userData?.user?.id || null,
        body: `Cliente: Aprovado em ${timestamp}`,
        is_adjustment_request: false,
      });

      await createNotification('content.approved', content.id, {
        title: content.title,
        date: content.date,
        channels: content.channels || [],
      });

      toast({
        title: "Story aprovado",
        description: "O story foi aprovado com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar o story",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da reprovação",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error: commentError } = await supabase
        .from("comments")
        .insert({
          content_id: content.id,
          version: content.version,
          author_user_id: user.id,
          body: `Reprovado: ${rejectReason}`,
          is_adjustment_request: true,
        });

      if (commentError) throw commentError;

      const { error: updateError } = await supabase
        .from("contents")
        .update({ status: "changes_requested" })
        .eq("id", content.id);

      if (updateError) throw updateError;

      await createNotification('content.rejected', content.id, {
        title: content.title,
        date: content.date,
        comment: rejectReason,
        channels: content.channels || [],
      });

      toast({
        title: "Story reprovado",
        description: "O story foi reprovado e o motivo foi registrado",
      });

      setShowRejectDialog(false);
      setRejectReason("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao reprovar:", error);
      toast({
        title: "Erro",
        description: "Erro ao reprovar o story",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("src_url")
        .eq("content_id", content.id);

      const { error } = await supabase
        .from("contents")
        .delete()
        .eq("id", content.id);

      if (error) throw error;

      if (mediaData && mediaData.length > 0) {
        const filePaths = mediaData
          .map(m => m.src_url.includes('/content-media/') ? m.src_url.split('/content-media/')[1] : m.src_url)
          .filter(Boolean);
        
        if (filePaths.length > 0) {
          await supabase.storage.from('content-media').remove(filePaths);
        }
      }

      toast({
        title: "Story removido",
        description: "O story foi removido com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao remover story:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover o story",
        variant: "destructive",
      });
    }
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-to-social', {
        body: { contentId: content.id }
      });

      if (error) {
        console.error('Erro ao chamar função:', error);
        toast({
          title: "Erro ao publicar",
          description: error.message || "Erro ao conectar com o serviço de publicação",
          variant: "destructive",
        });
        return;
      }

      // Verificar erros de negócio retornados pela função
      if (data && !data.success) {
        toast({
          title: "Não foi possível publicar",
          description: data.error || "Erro desconhecido ao publicar",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Story publicado!",
          description: `Story publicado em ${data.results?.length || 0} conta(s)`,
        });
        
        // Mostrar erros parciais se houver
        if (data.errors && data.errors.length > 0) {
          console.warn('Erros parciais:', data.errors);
          toast({
            title: "Atenção",
            description: `Algumas publicações falharam. Verifique os detalhes.`,
            variant: "destructive",
          });
        }
        
        onUpdate?.();
      }
    } catch (error: any) {
      console.error("Erro ao publicar story:", error);
      toast({
        title: "Erro ao publicar",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ auto_publish: true })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Agendamento ativado",
        description: `Story será publicado automaticamente em ${format(new Date(content.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao agendar:", error);
      toast({
        title: "Erro",
        description: "Erro ao agendar publicação",
        variant: "destructive",
      });
    }
  };

  const currentMedia = media[currentMediaIndex];

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow max-w-sm mx-auto">
        <CardContent className="p-0">
          {/* Header com Status e Opções */}
          <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusBadge(content.status)}
              <Badge variant="outline" className="text-xs">Story</Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowComments(!showComments)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comentários
                </DropdownMenuItem>
                {isAgencyView && (
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mídia em formato vertical (Story 9:16) */}
          <div className="relative bg-black aspect-[9/16]">
            {currentMedia && (
              currentMedia.kind === 'video' ? (
                <video
                  src={currentMedia.src_url}
                  className="w-full h-full object-contain"
                  controls
                  poster={currentMedia.thumb_url}
                />
              ) : (
                <img
                  src={currentMedia.src_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )
            )}
            
            {/* Indicadores de múltiplos stories */}
            {media.length > 1 && (
              <div className="absolute top-2 left-2 right-2 flex gap-1">
                {media.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-0.5 rounded-full transition-all ${
                      index === currentMediaIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navegação entre stories */}
            {media.length > 1 && (
              <div className="absolute inset-0 flex">
                <button
                  className="flex-1"
                  onClick={() => setCurrentMediaIndex(Math.max(0, currentMediaIndex - 1))}
                  disabled={currentMediaIndex === 0}
                />
                <button
                  className="flex-1"
                  onClick={() => setCurrentMediaIndex(Math.min(media.length - 1, currentMediaIndex + 1))}
                  disabled={currentMediaIndex === media.length - 1}
                />
              </div>
            )}
          </div>

          {/* Informações e Ações */}
          <div className="p-3 space-y-3">
            <div className="text-sm text-muted-foreground">
              {format(new Date(content.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            {/* Contador de stories */}
            {media.length > 1 && (
              <div className="text-xs text-center text-muted-foreground">
                {currentMediaIndex + 1} de {media.length} stories
              </div>
            )}

            {/* Ações do Cliente */}
            {isResponsible && content.status === 'in_review' && (
              <div className="flex gap-2">
                <Button onClick={handleApprove} className="flex-1" size="sm">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Aprovar
                </Button>
                <Button onClick={() => setShowRejectDialog(true)} variant="destructive" className="flex-1" size="sm">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  Reprovar
                </Button>
              </div>
            )}

            {/* Ações e Avisos de Publicação (Agency) */}
            {isAgencyView && content.status === 'approved' && (() => {
              const channels = content.channels || [];
              const hasFacebook = channels.some(ch => ch.toLowerCase().includes('facebook'));
              const hasInstagram = channels.some(ch => ch.toLowerCase().includes('instagram'));
              
              // Se tem Facebook, permite publicação com aviso sobre Instagram
              if (hasFacebook) {
                return (
                  <div className="space-y-3">
                    {hasInstagram && (
                      <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <strong className="text-foreground">Instagram:</strong> A API do Instagram não permite publicação automática de Stories. 
                              Você deverá publicar manualmente no Instagram após a publicação no Facebook.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handlePublishNow}
                        disabled={publishing}
                        size="sm"
                        className="flex-1"
                      >
                        {publishing ? "Publicando..." : hasInstagram ? "Publicar no Facebook" : "Publicar Agora"}
                      </Button>
                      <Button
                        onClick={handleSchedule}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Agendar
                      </Button>
                    </div>
                  </div>
                );
              }
              
              // Se tem apenas Instagram, mostra aviso completo sem botões
              return (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Publicação de Stories indisponível
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        A API oficial do Instagram ainda não permite a publicação de Stories diretamente por plataformas externas.
                        Essa é uma limitação imposta pelo Meta/Instagram, relacionada a políticas de segurança e privacidade.
                      </p>
                      <p className="text-xs font-medium text-foreground mt-2">
                        Você deve publicar seus Stories manualmente após a aprovação do conteúdo.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Reprovação */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Story</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação para a agência
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Descreva o que precisa ser ajustado..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este story? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
