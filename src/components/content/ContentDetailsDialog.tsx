import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, Linkedin, Calendar as CalendarIcon, MoreVertical, Edit, ImagePlus, Download, Link2, CheckCircle, Trash2, Save, AlertCircle, Zap } from "lucide-react";
import { ContentMedia } from "./ContentMedia";
import { ContentCaption } from "./ContentCaption";
import { ContentComments } from "./ContentComments";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimeInput } from "@/components/ui/time-input";
import { EditContentDialog } from "./EditContentDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onUpdate: () => void;
  isAgencyView?: boolean;
  focusHistory?: boolean;
}

interface Content {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  channels: string[];
  category?: string;
  version: number;
  created_at: string;
  updated_at: string;
  supplier_link?: string | null;
  published_at?: string | null;
  auto_publish?: boolean;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  is_adjustment_request: boolean;
  profiles?: {
    name: string;
  };
}

const getSocialIcon = (channel: string) => {
  const channelLower = channel.toLowerCase();
  if (channelLower.includes('facebook')) {
    return <Facebook className="h-4 w-4 text-[#1877F2]" />;
  }
  if (channelLower.includes('instagram')) {
    return <Instagram className="h-4 w-4 text-[#E4405F]" />;
  }
  if (channelLower.includes('linkedin')) {
    return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
  }
  return null;
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: "default" | "destructive" | "outline" | "pending" | "success" | "warning", label: string }> = {
    draft: { variant: "outline", label: "Rascunho" },
    in_review: { variant: "pending", label: "Em Revisão" },
    approved: { variant: "success", label: "Aprovado" },
    changes_requested: { variant: "destructive", label: "Ajuste Solicitado" },
    scheduled: { variant: "default", label: "Agendado" },
    published: { variant: "success", label: "Publicado" },
  };

  const config = statusConfig[status] || { variant: "outline" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const getTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    feed: "Feed",
    story: "Story",
    reels: "Reels",
    carousel: "Carrossel",
  };
  return typeMap[type] || type;
};

export function ContentDetailsDialog({
  open,
  onOpenChange,
  contentId,
  onUpdate,
  isAgencyView = false,
  focusHistory = false,
}: ContentDetailsDialogProps) {
  const [content, setContent] = useState<Content | null>(null);
  const [adjustments, setAdjustments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [supplierLink, setSupplierLink] = useState("");
  const [newDate, setNewDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [showDatePickerInDialog, setShowDatePickerInDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasMediaAndCaption = (content: any) => {
    if (!content) return false;
    
    // Verificar mídia - verificar em content_media (array de relacionamento)
    const hasMedia = Boolean(
      content.content_media && 
      Array.isArray(content.content_media) &&
      content.content_media.length > 0 && 
      content.content_media.some((m: any) => {
        const srcUrl = m.src_url || m.thumb_url;
        return srcUrl && String(srcUrl).trim() !== '';
      })
    );
    
    // Verificar legenda - verificar em content_texts (array de relacionamento) ou campo direto
    const hasCaption = Boolean(
      (content.content_texts && 
       Array.isArray(content.content_texts) &&
       content.content_texts.length > 0 && 
       content.content_texts.some((t: any) => {
         const caption = t.caption;
         return caption && String(caption).trim() !== '';
       })) ||
      // Fallback: verificar caption direto se disponível
      (content.caption && String(content.caption).trim() !== '') ||
      (content.legend && String(content.legend).trim() !== '')
    );
    
    return hasMedia && hasCaption;
  };

  const loadContentDetails = async () => {
    try {
      setLoading(true);

      // Buscar conteúdo principal com relacionamentos necessários
      const { data: contentData, error: contentError } = await supabase
        .from("contents")
        .select(`
          *,
          content_media (*),
          content_texts (*)
        `)
        .eq("id", contentId)
        .single();

      if (contentError) throw contentError;
      setContent(contentData);
      
      // Inicializar estados com dados do conteúdo
      setSupplierLink(contentData.supplier_link || "");
      setNewDate(new Date(contentData.date));
      const dateParts = String(contentData.date || "").includes("T") 
        ? contentData.date.split("T")[1] 
        : contentData.date.split(" ")[1] || "12:00:00";
      const [hh = "12", mm = "00"] = dateParts.split(":");
      setSelectedTime(`${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`);

      // Buscar histórico de ajustes (comentários com is_adjustment_request: true)
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:author_user_id (name)
        `)
        .eq("content_id", contentId)
        .eq("is_adjustment_request", true)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;
      setAdjustments(commentsData || []);
    } catch (error) {
      console.error("Error loading content details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceMedia = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !content) return;

    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      // Get current media
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("*")
        .eq("content_id", content.id)
        .order("order_index")
        .limit(1)
        .single();

      if (!mediaData) {
        toast.error("Mídia não encontrada");
        return;
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${content.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('content-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update media record
      const { error: updateError } = await supabase
        .from("content_media")
        .update({
          src_url: fileName,
          kind: isVideo ? 'video' : 'image',
        })
        .eq("id", mediaData.id);

      if (updateError) throw updateError;

      // Delete old file
      const oldPath = mediaData.src_url.includes('/content-media/')
        ? mediaData.src_url.split('/content-media/')[1]
        : mediaData.src_url;
      if (oldPath) {
        await supabase.storage.from('content-media').remove([oldPath]);
      }

      toast.success("Mídia substituída com sucesso!");
      loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error("Error replacing media:", error);
      toast.error("Erro ao substituir mídia: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!content) return;

    try {
      const { error } = await supabase
        .from("contents")
        .delete()
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Conteúdo removido com sucesso!");
      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting content:", error);
      toast.error("Erro ao remover conteúdo: " + error.message);
    }
  };

  const handleSaveSupplierLink = async () => {
    if (!content) return;

    try {
      const { error } = await supabase
        .from("contents")
        .update({ supplier_link: supplierLink } as any)
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Link do fornecedor salvo!");
      setShowSupplierDialog(false);
      loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving supplier link:", error);
      toast.error("Erro ao salvar link: " + error.message);
    }
  };

  const handleDownloadMedia = async () => {
    if (!content) return;

    try {
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("*")
        .eq("content_id", content.id)
        .order("order_index");

      if (!mediaData || mediaData.length === 0) {
        toast.error("Nenhuma mídia disponível para download");
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

      toast.success(`${mediaData.length} arquivo(s) em download`);
    } catch (error: any) {
      console.error("Error downloading media:", error);
      toast.error("Erro ao baixar mídia: " + error.message);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setNewDate(date);
    }
  };

  const handleDateTimeConfirm = async () => {
    if (!content) return;

    try {
      const [hours, minutes] = selectedTime.split(":");
      const updatedDate = new Date(newDate);
      updatedDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const { error } = await supabase
        .from("contents")
        .update({ date: updatedDate.toISOString() })
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Data atualizada com sucesso!");
      setShowDatePicker(false);
      loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error("Error updating date:", error);
      toast.error("Erro ao atualizar data: " + error.message);
    }
  };

  const handleMarkAdjustmentDone = async () => {
    if (!content) return;

    try {
      const { error } = await supabase
        .from("contents")
        .update({ status: "in_review" })
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Status atualizado para Em Revisão!");
      loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!content) return;
    
    try {
      const updateData: any = { [field]: value };
      
      const { error } = await supabase
        .from('contents')
        .update(updateData)
        .eq('id', content.id);
      
      if (error) throw error;
      
      const fieldLabels: Record<string, string> = {
        title: 'Título',
        date: 'Data',
        status: 'Status'
      };
      
      toast.success(`${fieldLabels[field] || 'Campo'} atualizado com sucesso!`);
      await loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao atualizar campo:', error);
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!content) return;
    
    try {
      const updateData: any = { 
        status: newStatus,
        auto_publish: false  // Sempre resetar ao mudar status manualmente
      };
      
      // Resetar scheduled_at se mudando de 'scheduled' para outro status
      if (newStatus !== 'scheduled') {
        updateData.scheduled_at = null;
      }
      
      const { error } = await supabase
        .from('contents')
        .update(updateData)
        .eq('id', content.id);
      
      if (error) throw error;
      
      toast.success('Status atualizado com sucesso!');
      await loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  const handlePublishNow = async () => {
    if (!content) return;

    try {
      const { error } = await supabase
        .from("contents")
        .update({ 
          status: "published" as any,
          published_at: new Date().toISOString() 
        } as any)
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Conteúdo publicado!");
      loadContentDetails();
      onUpdate();
    } catch (error: any) {
      console.error("Error publishing content:", error);
      toast.error("Erro ao publicar: " + error.message);
    }
  };

  useEffect(() => {
    if (open && contentId) {
      loadContentDetails();
    }
  }, [open, contentId]);

  useEffect(() => {
    if (open && focusHistory && historyRef.current && !loading) {
      setTimeout(() => {
        historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [open, focusHistory, loading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full min-h-0 p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                {isAgencyView && content && (
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
                      <DropdownMenuItem onClick={handleReplaceMedia} disabled={isUploading}>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        {isUploading ? "Enviando..." : "Substituir imagem"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDatePicker(true)}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Alterar data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadMedia}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar mídia
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowSupplierDialog(true)}>
                        <Link2 className="h-4 w-4 mr-2" />
                        Link fornecedor
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
                {isAgencyView && content ? (
                  <input
                    type="text"
                    value={content.title}
                    onChange={(e) => handleUpdateField('title', e.target.value)}
                    className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-muted-foreground focus:border-primary outline-none px-1 -ml-1 transition-colors"
                  />
                ) : (
                  <span className="text-lg font-semibold">{content?.title || "Carregando..."}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {content && (
                  isAgencyView ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="outline-none focus:ring-2 focus:ring-ring rounded-full">
                          {getStatusBadge(content.status)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-2 bg-background border shadow-lg z-50" align="start">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                            Alterar Status
                          </div>
                          <Separator />
                          <button
                            onClick={() => handleStatusChange('draft')}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Badge variant="outline" className="bg-gray-500/20 text-gray-600">Rascunho</Badge>
                          </button>
                          <button
                            onClick={() => handleStatusChange('in_review')}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Badge variant="pending">Em Revisão</Badge>
                          </button>
                          <button
                            onClick={() => handleStatusChange('approved')}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Badge variant="success">Aprovado</Badge>
                          </button>
                          <button
                            onClick={() => handleStatusChange('scheduled')}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Badge variant="default">Agendado</Badge>
                          </button>
                          <button
                            onClick={() => handleStatusChange('published')}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Badge variant="success" className="bg-purple-500/20 text-purple-600">Publicado</Badge>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    getStatusBadge(content.status)
                  )
                )}
              </div>
            </div>
            {content && (
              <>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-normal">
                  {isAgencyView ? (
                    <Popover open={showDatePickerInDialog} onOpenChange={setShowDatePickerInDialog}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-sm text-muted-foreground h-auto py-0 px-1 hover:text-foreground"
                          onClick={() => {
                            if (content) {
                              setNewDate(new Date(content.date));
                              const dateParts = String(content.date || "").includes("T") 
                                ? content.date.split("T")[1] 
                                : content.date.split(" ")[1] || "12:00:00";
                              const [hh = "12", mm = "00"] = dateParts.split(":");
                              setSelectedTime(`${hh}:${mm}`);
                            }
                          }}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {format(new Date(content.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-4">
                          <Calendar
                            mode="single"
                            selected={newDate}
                            onSelect={(date) => {
                              if (date) {
                                setNewDate(date);
                              }
                            }}
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
                          <Button 
                            onClick={async () => {
                              if (!content) return;
                              
                              try {
                                const [hours, minutes] = selectedTime.split(":");
                                const updatedDate = new Date(newDate);
                                updatedDate.setHours(parseInt(hours), parseInt(minutes), 0);

                                const { error } = await supabase
                                  .from("contents")
                                  .update({ date: updatedDate.toISOString() })
                                  .eq("id", content.id);

                                if (error) throw error;

                                toast.success("Data e hora atualizadas!");
                                loadContentDetails();
                                onUpdate();
                                setShowDatePickerInDialog(false);
                              } catch (error: any) {
                                console.error("Error updating date:", error);
                                toast.error("Erro ao atualizar data: " + error.message);
                              }
                            }} 
                            className="w-full"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(content.type)}
                  </Badge>
                  {content.channels && content.channels.length > 0 && (
                    <div className="flex items-center gap-1">
                      {content.channels.map((channel, idx) => (
                        <span key={idx}>{getSocialIcon(channel)}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isAgencyView && content && content.status === 'approved' && !content.published_at && (
                  <div className="flex flex-col gap-2 mt-3">
                    {!hasMediaAndCaption(content) && (
                      <div className="rounded-lg border border-warning/50 bg-warning/10 p-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Atenção:</strong> Este conteúdo não possui mídia ou legenda. Adicione antes de publicar.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={handlePublishNow}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Publicar Agora
                      </Button>
                      
                      {!content.auto_publish ? (
                        <Button 
                          onClick={() => setShowDatePicker(true)}
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Agendar Publicação
                        </Button>
                      ) : (
                        <Button 
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from("contents")
                                .update({ 
                                  auto_publish: false,
                                  scheduled_at: null,
                                  status: 'approved'
                                })
                                .eq("id", content.id);

                              if (error) throw error;
                              toast.success("Agendamento cancelado!");
                              loadContentDetails();
                              onUpdate();
                            } catch (error: any) {
                              console.error("Error:", error);
                              toast.error("Erro ao cancelar: " + error.message);
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          Cancelar Agendamento
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6 pr-2">
              {/* Seção de Mídia */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Mídia</h3>
                <ContentMedia contentId={contentId} type={content?.type || "feed"} />
              </div>

              <Separator />

              {/* Seção de Legenda */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Legenda</h3>
                <ContentCaption contentId={contentId} version={content?.version || 1} />
              </div>

              {/* Seção de Histórico de Ajustes */}
              {adjustments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Histórico de Ajustes
                    </h3>
                    <div className="space-y-3">
                      {adjustments.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {adjustment.profiles?.name || "Cliente"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(adjustment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{adjustment.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Seção de Comentários e Histórico */}
              <div ref={historyRef}>
                <h3 className="text-sm font-semibold mb-3">Comentários e Histórico</h3>
                <ContentComments
                  contentId={contentId}
                  onUpdate={onUpdate}
                  showHistory={true}
                />
              </div>
            </div>
          )}
        </ScrollArea>
        </div>
      </DialogContent>

      {/* EditContentDialog */}
      {showEditDialog && (
        <EditContentDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          contentId={contentId}
          onSuccess={() => {
            loadContentDetails();
            onUpdate();
          }}
        />
      )}

      {/* AlertDialog de Delete */}
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

      {/* Dialog de Link do Fornecedor */}
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
            {content?.supplier_link && (
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

      {/* Popover de Alterar Data */}
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <span className="hidden"></span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <Calendar
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

      {/* Input file oculto para substituir mídia */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </Dialog>
  );
}