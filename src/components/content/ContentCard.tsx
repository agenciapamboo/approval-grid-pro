import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
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
import { createNotification } from "@/lib/notifications";

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
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const icons: Record<string, { Icon: any; color: string }> = {
      instagram: { Icon: Instagram, color: '#E4405F' },
      facebook: { Icon: Facebook, color: '#1877F2' },
      youtube: { Icon: Youtube, color: '#FF0000' },
      linkedin: { Icon: Linkedin, color: '#0A66C2' },
      tiktok: { Icon: Twitter, color: '#000000' },
    };
    return icons[channel.toLowerCase()] || null;
  };

  const handleApprove = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateErr } = await supabase
        .from("contents")
        .update({ status: "approved" })
        .eq("id", content.id);
      if (updateErr) throw updateErr;

      // Registrar comentário automático de aprovação
      const timestamp = new Date().toLocaleString('pt-BR');
      await supabase.from('comments').insert({
        content_id: content.id,
        version: content.version,
        author_user_id: userData?.user?.id || null,
        body: `Cliente: Aprovado em ${timestamp}`,
        is_adjustment_request: false,
      });

      // Disparar notificação de aprovação
      await createNotification('content.approved', content.id, {
        title: content.title,
        date: content.date,
        channels: content.channels || [],
      });

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

      // Disparar notificação de reprovação
      await createNotification('content.rejected', content.id, {
        title: content.title,
        date: content.date,
        comment: rejectReason,
        channels: content.channels || [],
      });

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
    setNewDate(date);
  };

  const handleDateTimeConfirm = async () => {
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const dateTime = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        hours,
        minutes
      );
      
      const { error } = await supabase
        .from("contents")
        .update({ date: format(dateTime, "yyyy-MM-dd HH:mm:ss") })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Data e hora atualizadas",
        description: "A data e hora de postagem foram atualizadas com sucesso",
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

  const handleSubmitForReview = async () => {
    try {
      // Buscar dados do usuário para notificação
      const { data: { user } } = await supabase.auth.getUser();

      // Disparar apenas o gatilho de aprovação (sem alterar status)
      const resReady = await createNotification('content.ready_for_approval', content.id, {
        title: content.title,
        date: content.date,
        actor: {
          name: user?.user_metadata?.name || user?.email || 'Agência',
          email: user?.email,
          phone: (user?.user_metadata as any)?.phone || undefined,
        },
        channels: content.channels || [],
      });
      console.log('Disparo de notificação:', { event: 'content.ready_for_approval', content_id: content.id, ok: resReady.success });

      toast({
        title: "Enviado para aprovação",
        description: "O conteúdo foi enviado para aprovação do cliente",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao enviar para aprovação:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar para aprovação",
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

      // Buscar dados do usuário para notificação
      const { data: { user } } = await supabase.auth.getUser();

      // Disparar notificação de ajuste concluído (notify-event)
      const resAdj = await createNotification('content.adjustment_completed', content.id, {
        title: content.title,
        date: content.date,
        actor: {
          name: user?.user_metadata?.name || user?.email || 'Agência',
          email: user?.email,
          phone: (user?.user_metadata as any)?.phone || undefined,
        },
        channels: content.channels || [],
      });
      console.log('Disparo de notificação:', { event: 'content.adjustment_completed', content_id: content.id, ok: resAdj.success });

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
                        {format(new Date(content.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-4">
                        <CalendarComponent
                          mode="single"
                          selected={newDate}
                          onSelect={handleDateChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">Hora:</label>
                          <TimePicker
                            onChange={(value) => setSelectedTime(value || "12:00")}
                            value={selectedTime}
                            disableClock
                            format="HH:mm"
                            className="border rounded px-2"
                          />
                        </div>
                        <Button onClick={handleDateTimeConfirm} className="w-full">
                          Confirmar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">{getTypeLabel(content.type)}</span>
                {getStatusBadge(content.status)}
                {content.channels && content.channels.length > 0 && (
                  <div className="flex items-center gap-1">
                    {content.channels.map((channel) => {
                      const iconData = getSocialIcon(channel);
                      if (!iconData) return null;
                      const { Icon, color } = iconData;
                      return (
                        <div 
                          key={channel}
                          className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: color }}
                          title={channel}
                        >
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                      );
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
              <div className="flex flex-col gap-2">
                {content.status !== "approved" && (
                  <>
                    <Button 
                      size="sm"
                      variant="success"
                      onClick={handleApprove}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm"
                      variant="warning"
                      onClick={() => setShowAdjustment(true)}
                      className="w-full"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Solicitar ajuste
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectDialog(true)}
                      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Reprovar
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowComments(!showComments)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comentários
                </Button>
              </div>
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
