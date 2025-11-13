import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeInput } from "@/components/ui/time-input";
import { MessageSquare, CheckCircle, AlertCircle, MoreVertical, Trash2, ImagePlus, Calendar, Instagram, Facebook, Youtube, Linkedin, Twitter, AlertTriangle, Edit, Download, Link2, Save, XCircle, FileText, ImageIcon, Images, Video, Smartphone, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";
import { ContentComments } from "./ContentComments";
import { RequestAdjustmentDialog } from "./RequestAdjustmentDialog";
import { EditContentDialog } from "./EditContentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
import { usePermissions } from "@/hooks/usePermissions";

interface ContentCardProps {
  content: {
    id: string;
    title: string;
    date: string;
    scheduled_at?: string | null;
    deadline?: string;
    type: string;
    status: string;
    version: number;
    channels?: string[];
    auto_publish?: boolean;
    published_at?: string | null;
    supplier_link?: string | null;
    is_content_plan?: boolean;
    plan_description?: string | null;
    media_path?: string | null;
    caption?: string | null;
    legend?: string | null;
    agency_id?: string | null;
  };
  isResponsible: boolean;
  isAgencyView?: boolean;
  isPublicApproval?: boolean;
  approvalToken?: string;
  onUpdate: () => void;
}

export function ContentCard({ content, isResponsible, isAgencyView = false, isPublicApproval = false, approvalToken, onUpdate }: ContentCardProps) {
  const { toast } = useToast();
  const { can } = usePermissions();
  const [showComments, setShowComments] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const contentDateValue = content.scheduled_at ?? content.date;
  const parsedContentDate = (() => {
    if (!contentDateValue) return new Date();
    const parsed = new Date(contentDateValue);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();
  const [newDate, setNewDate] = useState<Date>(parsedContentDate);
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const raw = String(contentDateValue || "");
    const parts = raw.includes("T") ? raw.split("T")[1] : raw.split(" ")[1] || "12:00:00";
    const [hh = "12", mm = "00"] = parts.split(":");
    return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
  });
  const [publishing, setPublishing] = useState(false);
  const [supplierLink, setSupplierLink] = useState(content.supplier_link || "");
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStatusBadge = (status: string, publishedAt?: string | null) => {
    // Se foi publicado, mostrar badge de publicado (não clicável)
    if (publishedAt) {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--success))] text-white">Publicado</span>;
    }
    
    const map: Record<string, { label: string; classes: string }> = {
      draft: { label: "Rascunho", classes: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
      in_review: { label: "Em Revisão", classes: "bg-[hsl(var(--accent))] text-white" },
      changes_requested: { label: "Ajustes Solicitados", classes: "bg-[hsl(var(--warning))] text-white" },
      approved: { label: "Aprovado", classes: "bg-[hsl(var(--success))] text-white" },
    };
    const cfg = map[status] || { label: status, classes: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]" };
    
    // Apenas clicável na visão da agência
    if (isAgencyView) {
      return (
        <span 
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => setShowStatusDialog(true)}
          title="Clique para alterar o status"
        >
          {cfg.label}
        </span>
      );
    }
    
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

  const ContentPlanIcon = ({ type }: { type: string }) => {
    const icons: Record<string, any> = {
      image: ImageIcon,
      carousel: Images,
      reels: Video,
      story: Smartphone,
      feed: Video,
    };
    
    const Icon = icons[type] || ImageIcon;
    
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg">
        <Icon className="h-16 w-16 text-muted-foreground" />
        <span className="mt-2 text-sm font-medium text-muted-foreground">
          {getTypeLabel(type)}
        </span>
        <Badge variant="outline" className="mt-1">Plano de Conteúdo</Badge>
      </div>
    );
  };

  const handleConvertToProd = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({
          is_content_plan: false,
          status: 'draft',
        })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Convertido para produção",
        description: "O plano aprovado foi convertido. Agora você pode adicionar as mídias.",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao converter:", error);
      toast({
        title: "Erro",
        description: "Erro ao converter o plano",
        variant: "destructive",
      });
    }
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
      // Fluxo normal autenticado
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
          date: contentDateValue || content.date,
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
      // Fluxo normal autenticado
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
          date: contentDateValue || content.date,
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

      // Salvar apenas o caminho no bucket (não URL pública)
      const publicUrl = fileName;

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
      const oldPath = mediaData.src_url.includes('/content-media/')
        ? mediaData.src_url.split('/content-media/')[1]
        : mediaData.src_url;
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
      const { data, error } = await supabase.functions.invoke('delete-content', {
        body: { contentId: content.id },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Falha ao remover');
      }

      toast({
        title: 'Conteúdo removido',
        description: 'O conteúdo foi removido com sucesso',
      });

      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover conteúdo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover o conteúdo',
        variant: 'destructive',
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
      const year = newDate.getFullYear();
      const month = newDate.getMonth();
      const day = newDate.getDate();
      
      // String no formato ISO local com "T" para evitar parse UTC no front
      const dateTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      const { error } = await supabase
        .from("contents")
        .update({ date: dateTimeString })
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: newStatus as "draft" | "in_review" | "approved" | "changes_requested" })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do conteúdo foi atualizado com sucesso",
      });

      setShowStatusDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o status",
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
        date: contentDateValue || content.date,
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
        date: contentDateValue || content.date,
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
          title: "Publicado com sucesso!",
          description: `Conteúdo publicado em ${data.results?.length || 0} conta(s)`,
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
      console.error("Erro ao publicar:", error);
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
      // Atualizar para auto-publicar no horário agendado
      const { error } = await supabase
        .from("contents")
        .update({ auto_publish: true })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Agendamento ativado",
      description: `Conteúdo será publicado automaticamente em ${format(parsedContentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
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

  const handleCancelSchedule = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ auto_publish: false })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Agendamento cancelado",
        description: "A publicação automática foi cancelada",
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento",
        variant: "destructive",
      });
    }
  };

  const handleSaveSupplierLink = async () => {
    try {
      const { error } = await supabase
        .from("contents")
        .update({ supplier_link: supplierLink } as any)
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Link salvo",
        description: "Link do fornecedor foi salvo com sucesso",
      });

      setShowSupplierDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar link:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar link do fornecedor",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMedia = async () => {
    try {
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("*")
        .eq("content_id", content.id)
        .order("order_index");

      if (!mediaData || mediaData.length === 0) {
        toast({
          title: "Nenhuma mídia",
          description: "Não há mídia disponível para download",
          variant: "destructive",
        });
        return;
      }

      mediaData.forEach((media, index) => {
        const link = document.createElement('a');
        link.href = media.src_url;
        link.download = `${content.title}-${index + 1}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      toast({
        title: "Download iniciado",
        description: `${mediaData.length} arquivo(s) em download`,
      });
    } catch (error) {
      console.error("Erro ao baixar mídia:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar mídia",
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
                    <DropdownMenuContent align="start" className="bg-background z-50">
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar conteúdo
                      </DropdownMenuItem>
                      {!content.is_content_plan && (
                        <DropdownMenuItem onClick={handleReplaceMedia}>
                          <ImagePlus className="h-4 w-4 mr-2" />
                          Substituir imagem
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setShowDatePicker(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Alterar data
                      </DropdownMenuItem>
                      {!content.is_content_plan && (
                        <DropdownMenuItem onClick={handleDownloadMedia}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar mídia
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setShowSupplierDialog(true)}>
                        <Link2 className="h-4 w-4 mr-2" />
                        Link fornecedor
                      </DropdownMenuItem>
                      {content.is_content_plan && content.status === 'approved' && (
                        <DropdownMenuItem onClick={handleConvertToProd}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Converter em Produção
                        </DropdownMenuItem>
                      )}
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
                        {format(parsedContentDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
                        <div className="flex flex-col items-center gap-2">
                          <label className="text-sm font-medium">Hora</label>
                          <TimeInput
                            value={selectedTime}
                            onChange={(value) => setSelectedTime(value)}
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
                {getStatusBadge(content.status, content.published_at)}
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

          {/* Linha 2: Criativo ou Plano */}
          {content.is_content_plan ? (
            <>
              <ContentPlanIcon type={content.type} />
              {content.plan_description && (
                <div className="p-4 bg-muted/50 space-y-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descrição do Plano
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {content.plan_description}
                  </p>
                  
                  {content.status === 'approved' && (
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        ✅ <strong>Plano aprovado!</strong> A agência irá converter este plano em produção, adicionar as mídias finais e enviar novamente para aprovação.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <ContentMedia
              contentId={content.id}
              type={content.type}
              approvalToken={approvalToken}
              mediaPath={content.media_path}
            />
          )}

          {/* Linha 3: Legenda */}
          <ContentCaption
            contentId={content.id}
            version={content.version}
            approvalToken={approvalToken}
            initialCaption={content.caption ?? content.legend ?? undefined}
          />

          {/* Ações - Simplificado para visualização pública */}
          {!isAgencyView && (
            <div className="p-4 border-t">
              <div className="flex flex-col gap-2">
                {isPublicApproval ? (
                  // Visualização pública via token - exibir botões para TODOS exceto approved e publicados
                  (!content.published_at && content.status !== "approved") ? (
                    <>
                      <Button size="sm" variant="success" onClick={handleApprove} className="w-full">
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
                        <XCircle className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {showComments ? "Ocultar Histórico" : "Exibir Histórico"}
                      </Button>
                    </>
                  ) : (
                    // Para aprovados/publicados: apenas histórico/comentários
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                      className="w-full"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {showComments ? "Ocultar Histórico" : "Exibir Histórico"}
                    </Button>
                  )
                ) : (
                  // Visualização autenticada - exibir botões para TODOS exceto approved e publicados
                  (!content.published_at && content.status !== "approved") ? (
                    <>
                      <Button size="sm" variant="success" onClick={handleApprove} className="w-full">
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
                        <XCircle className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {showComments ? "Ocultar Histórico" : "Exibir Histórico"}
                      </Button>
                    </>
                  ) : (
                    // Para aprovados/publicados: apenas histórico
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                      className="w-full"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {showComments ? "Ocultar Histórico" : "Exibir Histórico"}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Ações de Publicação - Apenas para Agência */}
          {isAgencyView && (() => {
            const isStory = content.type === 'story';
            const channels = content.channels || [];
            const hasFacebook = channels.some(ch => ch.toLowerCase().includes('facebook'));
            const hasInstagram = channels.some(ch => ch.toLowerCase().includes('instagram'));
            
            // Se for story com apenas Instagram ou sem Facebook, mostra aviso completo
            if (isStory && (!hasFacebook || (hasInstagram && !hasFacebook))) {
              return (
                <div className="p-4 border-t">
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
                </div>
              );
            }
            
            // Se for story com Facebook, mostra botões com aviso sobre Instagram
            if (isStory && hasFacebook) {
              return (
                <div className="p-4 border-t">
                  <div className="flex flex-col gap-3">
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
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm"
                        onClick={handlePublishNow}
                        disabled={publishing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {publishing ? 'Publicando...' : hasInstagram ? 'Publicar no Facebook' : 'Publicar Agora'}
                      </Button>
                      {!content.auto_publish ? (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={handleSchedule}
                          className="w-full"
                        >
                          Agendar Publicação
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={handleCancelSchedule}
                          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          Cancelar Agendamento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Para conteúdos normais (não stories), mostra os botões normalmente
            return (
              <div className="p-4 border-t">
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm"
                    onClick={handlePublishNow}
                    disabled={publishing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {publishing ? 'Publicando...' : 'Publicar Agora'}
                  </Button>
                  {!content.auto_publish ? (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={handleSchedule}
                      className="w-full"
                    >
                      Agendar Publicação
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={handleCancelSchedule}
                      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Cancelar Agendamento
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Comentários expandidos - sempre visível para clientes */}
          {(isPublicApproval || !isAgencyView) && (
            <div className="border-t">
              <ContentComments contentId={content.id} onUpdate={onUpdate} showHistory={showComments} approvalToken={approvalToken} />
            </div>
          )}
        </CardContent>
      </Card>

      <EditContentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contentId={content.id}
        onSuccess={onUpdate}
      />

      <RequestAdjustmentDialog
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        contentId={content.id}
        onSuccess={onUpdate}
        approvalToken={approvalToken}
      />

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Selecione o novo status para este conteúdo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleStatusChange("draft")}
            >
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] mr-2">
                Rascunho
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleStatusChange("in_review")}
            >
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--accent))] text-white mr-2">
                Em Revisão
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleStatusChange("approved")}
            >
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--success))] text-white mr-2">
                Aprovado
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleStatusChange("changes_requested")}
            >
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--warning))] text-white mr-2">
                Ajustes Solicitados
              </span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link do Fornecedor</DialogTitle>
            <DialogDescription>
              Insira o link do Google Drive, iCloud ou outro serviço onde o fornecedor pode baixar os arquivos fechados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="https://drive.google.com/..."
              value={supplierLink}
              onChange={(e) => setSupplierLink(e.target.value)}
            />
            {content.supplier_link && (
              <p className="text-xs text-muted-foreground mt-2">
                Link atual: <a href={content.supplier_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{content.supplier_link}</a>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSupplierLink}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Link
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
