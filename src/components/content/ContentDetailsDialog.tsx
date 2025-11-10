import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Facebook, Instagram, Linkedin, Calendar as CalendarIcon, MoreVertical, Edit, ImagePlus, Download, Link2, CheckCircle, Trash2, Save, AlertCircle } from "lucide-react";
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
}: ContentDetailsDialogProps) {
  const [content, setContent] = useState<Content | null>(null);
  const [adjustments, setAdjustments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [supplierLink, setSupplierLink] = useState("");
  const [newDate, setNewDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContentDetails = async () => {
    try {
      setLoading(true);

      // Buscar conteúdo principal
      const { data: contentData, error: contentError } = await supabase
        .from("contents")
        .select("*")
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

  useEffect(() => {
    if (open && contentId) {
      loadContentDetails();
    }
  }, [open, contentId]);

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
                <span className="text-lg font-semibold">{content?.title || "Carregando..."}</span>
              </div>
              {content && getStatusBadge(content.status)}
            </div>
            {content && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-normal">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
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

              {/* Seção de Comentários */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Comentários</h3>
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