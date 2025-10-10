import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, CheckCircle, AlertCircle, MoreVertical, Trash2, ImagePlus, Calendar, Instagram, Facebook, Youtube, Linkedin, Twitter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";
import { ContentComments } from "./ContentComments";
import { RequestAdjustmentDialog } from "./RequestAdjustmentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContentCardProps {
  content: {
    id: string;
    title: string;
    date: string;
    deadline?: string;
    type: string;
    status: string;
    version: number;
    channels?: string[];
  };
  isResponsible: boolean;
  isAgencyView?: boolean;
  onUpdate: () => void;
}

export function ContentCard({ content, isResponsible, isAgencyView = false, onUpdate }: ContentCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(true);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState<Date>(new Date(content.date));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      in_review: { variant: "default", label: "Em Revisão" },
      changes_requested: { variant: "destructive", label: "Ajustes Solicitados" },
      approved: { variant: "outline", label: "Aprovado" },
    };
    
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      image: "Imagem",
      carousel: "Carrossel",
      reels: "Reels",
      story: "Story",
      feed: "Feed",
    };
    return labels[type] || type;
  };

  const getSocialIcon = (channel: string) => {
    const icons: Record<string, any> = {
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube,
      linkedin: Linkedin,
      twitter: Twitter,
    };
    return icons[channel.toLowerCase()] || null;
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: "approved" })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Conteúdo aprovado",
        description: "O conteúdo foi aprovado com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar o conteúdo",
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
      // Criar comentário com o motivo da reprovação
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

      // Atualizar status para changes_requested
      const { error: updateError } = await supabase
        .from("contents")
        .update({ status: "changes_requested" })
        .eq("id", content.id);

      if (updateError) throw updateError;

      toast({
        title: "Conteúdo reprovado",
        description: "O conteúdo foi reprovado e o motivo foi registrado",
      });

      setShowRejectDialog(false);
      setRejectReason("");
      onUpdate();
    } catch (error) {
      console.error("Erro ao reprovar:", error);
      toast({
        title: "Erro",
        description: "Erro ao reprovar o conteúdo",
        variant: "destructive",
      });
    }
  };

  const handleReplaceMedia = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens ou vídeos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar a mídia atual
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("*")
        .eq("content_id", content.id)
        .order("order_index")
        .limit(1)
        .single();

      if (!mediaData) {
        toast({
          title: "Erro",
          description: "Mídia não encontrada",
          variant: "destructive",
        });
        return;
      }

      // Upload do novo arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${content.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-media')
        .getPublicUrl(fileName);

      // Atualizar registro de mídia
      const { error: updateError } = await supabase
        .from("content_media")
        .update({
          src_url: publicUrl,
          kind: isVideo ? 'video' : 'image',
        })
        .eq("id", mediaData.id);

      if (updateError) throw updateError;

      // Deletar arquivo antigo do storage
      const oldPath = mediaData.src_url.split('/content-media/')[1];
      if (oldPath) {
        await supabase.storage.from('content-media').remove([oldPath]);
      }

      toast({
        title: "Mídia substituída",
        description: "A mídia foi substituída com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao substituir mídia:", error);
      toast({
        title: "Erro",
        description: "Erro ao substituir a mídia",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      // Buscar todas as mídias para deletar do storage
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("src_url")
        .eq("content_id", content.id);

      // Deletar conteúdo (cascade irá deletar mídias e textos)
      const { error } = await supabase
        .from("contents")
        .delete()
        .eq("id", content.id);

      if (error) throw error;

      // Deletar arquivos do storage
      if (mediaData && mediaData.length > 0) {
        const filePaths = mediaData
          .map(m => m.src_url.split('/content-media/')[1])
          .filter(Boolean);
        
        if (filePaths.length > 0) {
          await supabase.storage.from('content-media').remove(filePaths);
        }
      }

      toast({
        title: "Conteúdo removido",
        description: "O conteúdo foi removido com sucesso",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao remover conteúdo:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover o conteúdo",
        variant: "destructive",
      });
    }
  };

  const handleDateChange = async (date: Date | undefined) => {
    if (!date) return;
    
    try {
      const { error } = await supabase
        .from("contents")
        .update({ date: format(date, "yyyy-MM-dd") })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Data atualizada",
        description: "A data de postagem foi atualizada com sucesso",
      });

      setShowDatePicker(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar a data",
        variant: "destructive",
      });
    }
  };

  const handleMarkAdjustmentDone = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: "in_review" })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Ajuste concluído",
        description: "O conteúdo foi retornado para aprovação do cliente",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao marcar ajuste como feito:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o status",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          {/* Linha 1: Data e Tipo */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAgencyView && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleReplaceMedia}>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Substituir imagem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDatePicker(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Alterar data
                      </DropdownMenuItem>
                      {content.status === 'changes_requested' && (
                        <DropdownMenuItem onClick={handleMarkAdjustmentDone}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Ajuste feito
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover conteúdo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Previsão de postagem
                  </div>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors">
                        {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newDate}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">Tipo: {getTypeLabel(content.type)}</Badge>
                {getStatusBadge(content.status)}
                {content.channels && content.channels.length > 0 && (
                  <div className="flex items-center gap-1">
                    {content.channels.map((channel) => {
                      const Icon = getSocialIcon(channel);
                      return Icon ? (
                        <div 
                          key={channel}
                          className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
                          title={channel}
                        >
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
            {content.deadline && (
              <div className="text-xs text-muted-foreground mt-1">
                Prazo: {format(new Date(content.deadline), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Linha 2: Criativo */}
          <ContentMedia contentId={content.id} type={content.type} />

          {/* Linha 3: Legenda */}
          <ContentCaption contentId={content.id} version={content.version} />

          {/* Ações */}
          {!isAgencyView && (
            <div className="p-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comentários
                </Button>
                
                {content.status !== "approved" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAdjustment(true)}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Solicitar Ajuste
                  </Button>
                )}
              </div>
              
              {content.status !== "approved" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button 
                    size="sm"
                    onClick={handleApprove}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reprovar
                  </Button>
                </div>
              )}
              
              {content.status === "approved" && (
                <div className="mt-2">
                  <Button 
                    size="sm"
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    disabled
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovado
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Comentários expandidos */}
          {showComments && (
            <div className="border-t">
              <ContentComments contentId={content.id} onUpdate={onUpdate} />
            </div>
          )}
        </CardContent>
      </Card>

      <RequestAdjustmentDialog
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        contentId={content.id}
        onSuccess={onUpdate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este conteúdo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Conteúdo</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da reprovação deste conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Descreva o motivo da reprovação..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
