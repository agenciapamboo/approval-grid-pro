import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CalendarIcon, Save, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { checkMonthlyPostsLimit, checkCreativesStorageLimit } from "@/lib/plan-limits";
import { CreativeRotationDialog } from "./CreativeRotationDialog";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface CreateAvulsoCardProps {
  clientId: string;
  onContentCreated: () => void;
  initialDate?: Date;
  initialTitle?: string;
}

export function CreateAvulsoCard({ clientId, onContentCreated, initialDate, initialTitle }: CreateAvulsoCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRotationDialog, setShowRotationDialog] = useState(false);
  const [limitCheckData, setLimitCheckData] = useState<{ type: 'posts' | 'creatives'; limit: number; current: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { status } = useSubscriptionStatus();

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens ou vídeos",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
    setHasChanges(true);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!title || !date) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título e selecione uma data",
        variant: "destructive",
      });
      return;
    }

    // Verificar limites se não for usuário interno
    if (status && !status.skipSubscriptionCheck) {
      // Verificar limite de posts mensais
      const postsCheck = await checkMonthlyPostsLimit(clientId);
      if (!postsCheck.withinLimit) {
        setLimitCheckData({ type: 'posts', limit: postsCheck.limit || 0, current: postsCheck.currentCount });
        setShowRotationDialog(true);
        return;
      }

      // Verificar limite de criativos arquivados
      const creativesCheck = await checkCreativesStorageLimit(clientId);
      if (!creativesCheck.withinLimit) {
        setLimitCheckData({ type: 'creatives', limit: creativesCheck.limit || 0, current: creativesCheck.currentCount });
        setShowRotationDialog(true);
        return;
      }
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: content, error: contentError } = await supabase
        .from("contents")
        .insert([{
          client_id: clientId,
          title: title,
          date: format(date, "yyyy-MM-dd"),
          type: 'image',
          status: 'in_review' as const,
          owner_user_id: user.id,
          category: 'avulso',
          channels: [],
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      // Validação de tamanho de arquivo (50MB por arquivo)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB em bytes
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          toast({ 
            title: 'Arquivo muito grande', 
            description: `O arquivo "${file.name}" tem ${sizeMB}MB. O tamanho máximo permitido é 50MB.`, 
            variant: 'destructive' 
          });
          throw new Error(`Arquivo ${file.name} excede o tamanho máximo permitido`);
        }
      }

      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${content.id}/${Date.now()}-${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('content-media')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Salvar apenas o caminho no bucket (não URL pública)
          const publicUrl = fileName;

          await supabase
            .from("content_media")
            .insert({
              content_id: content.id,
              src_url: publicUrl,
              kind: file.type.startsWith('video/') ? 'video' : 'image',
              order_index: i,
            });
        }
      }

      if (description) {
        await supabase
          .from("content_texts")
          .insert({
            content_id: content.id,
            caption: description,
            version: 1,
          });
      }

      toast({
        title: "Conteúdo criado",
        description: "O conteúdo avulso foi criado com sucesso",
      });

      setFiles([]);
      setPreviews([]);
      setTitle("");
      setDescription("");
      setDate(undefined);
      setHasChanges(false);
      onContentCreated();

    } catch (error: any) {
      console.error('Erro ao criar conteúdo:', error);
      const msg = error?.message || error?.error?.message || error?.details || 'Erro ao criar o conteúdo';
      toast({
        title: 'Erro',
        description: `Erro ao criar o conteúdo: ${msg}`,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    const [movedFile] = newFiles.splice(fromIndex, 1);
    const [movedPreview] = newPreviews.splice(fromIndex, 1);
    
    newFiles.splice(toIndex, 0, movedFile);
    newPreviews.splice(toIndex, 0, movedPreview);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    setHasChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOverImage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropImage = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (fromIndex !== toIndex) {
      moveImage(fromIndex, toIndex);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 relative">
        {files.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "aspect-video flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging ? "bg-primary/10 border-2 border-primary border-dashed" : "hover:bg-muted/50"
            )}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Mídia opcional
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Até 10 imagens/vídeos
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-5 gap-2">
              {previews.map((preview, index) => (
                <div 
                  key={index} 
                  className="relative group cursor-move aspect-square"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOverImage(e, index)}
                  onDrop={(e) => handleDropImage(e, index)}
                >
                  {files[index].type.startsWith('video/') ? (
                    <video src={preview} className="w-full h-full object-cover rounded border" />
                  ) : (
                    <img src={preview} alt="" className="w-full h-full object-cover rounded border" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
              {files.length < 10 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Arraste para reordenar • {files.length}/10 imagens
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="p-4 space-y-3">
        <Input
          placeholder="Título do conteúdo *"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasChanges(true);
          }}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: ptBR }) : "Selecionar data *"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  const localDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0);
                  setDate(localDate);
                  setHasChanges(true);
                }
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Textarea
          placeholder="Descrição ou observações..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setHasChanges(true);
          }}
          className="min-h-[100px]"
        />

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Conteúdo
              </>
          )}
        </Button>
        )}
      </div>

      {/* Creative Rotation Dialog */}
      {limitCheckData && (
        <CreativeRotationDialog
          open={showRotationDialog}
          onOpenChange={setShowRotationDialog}
          clientId={clientId}
          limitType={limitCheckData.type}
          limit={limitCheckData.limit}
          currentCount={limitCheckData.current}
          onArchiveComplete={() => {
            setShowRotationDialog(false);
            setLimitCheckData(null);
            // Tentar salvar novamente após arquivamento
            handleSave();
          }}
        />
      )}
    </div>
  );
}
