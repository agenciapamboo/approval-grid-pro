import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, AlertCircle, MoreVertical, Trash2, ImagePlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  };
  isResponsible: boolean;
  isAgencyView?: boolean;
  onUpdate: () => void;
}

export function ContentCard({ content, isResponsible, isAgencyView = false, onUpdate }: ContentCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    };
    return labels[type] || type;
  };

  const handleApprove = async () => {
    if (!isResponsible) {
      toast({
        title: "Ação não permitida",
        description: "Apenas o responsável do cliente pode aprovar conteúdos",
        variant: "destructive",
      });
      return;
    }

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
                  <span className="font-medium text-sm">
                    {format(new Date(content.date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Tipo: {getTypeLabel(content.type)}</Badge>
                {getStatusBadge(content.status)}
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
            <div className="p-4 border-t flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowComments(!showComments)}
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comentários
              </Button>
              
              {content.status !== "approved" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAdjustment(true)}
                    className="flex-1"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Solicitar Ajuste
                  </Button>
                  
                  {isResponsible && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleApprove}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                  )}
                </>
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
