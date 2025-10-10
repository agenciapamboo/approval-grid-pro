import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CalendarIcon, Save, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CreateContentCardProps {
  clientId: string;
  onContentCreated: () => void;
  category?: 'social' | 'avulso';
}

const CHANNELS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube'] as const;

export function CreateContentCard({ clientId, onContentCreated, category = 'social' }: CreateContentCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState<Date>();
  const [channels, setChannels] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
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

  const handleCaptionChange = (value: string) => {
    setCaption(value);
    setHasChanges(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log("Legenda salva automaticamente:", value);
    }, 1000);
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (files.length === 0 || !date) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, adicione pelo menos uma mídia e selecione uma data",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contentType = files.length > 1 ? 'carousel' : 
                         files[0].type.startsWith('video/') ? 'reels' : 'image';

      const { data: content, error: contentError } = await supabase
        .from("contents")
        .insert([{
          client_id: clientId,
          title: `Conteúdo ${format(date, "dd/MM/yyyy")}`,
          date: format(date, "yyyy-MM-dd"),
          type: contentType,
          status: 'draft' as const,
          owner_user_id: user.id,
          channels: channels,
          category: category,
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${content.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(fileName);

        await supabase
          .from("content_media")
          .insert({
            content_id: content.id,
            src_url: publicUrl,
            kind: file.type.startsWith('video/') ? 'video' : 'image',
            order_index: i,
          });
      }

      if (caption) {
        await supabase
          .from("content_texts")
          .insert({
            content_id: content.id,
            caption: caption,
            version: 1,
          });
      }

      toast({
        title: "Conteúdo criado",
        description: "O conteúdo foi criado com sucesso",
      });

      setFiles([]);
      setPreviews([]);
      setCaption("");
      setDate(undefined);
      setChannels([]);
      setHasChanges(false);
      onContentCreated();

    } catch (error) {
      console.error("Erro ao criar conteúdo:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar o conteúdo",
        variant: "destructive",
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
    <Card className="overflow-hidden">
      <div className="w-full bg-muted/30 relative">
        {files.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full aspect-[4/5] flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging ? "bg-primary/10 border-2 border-primary border-dashed" : "hover:bg-muted/50"
            )}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Clique ou arraste arquivos aqui
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
              {date ? format(date, "PPP", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                setHasChanges(true);
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Textarea
          placeholder="Escreva a legenda..."
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          className="min-h-[100px]"
        />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Canais de publicação</Label>
          <div className="grid grid-cols-2 gap-3">
            {CHANNELS.map((channel) => (
              <div key={channel} className="flex items-center space-x-2">
                <Checkbox
                  id={`channel-${channel}`}
                  checked={channels.includes(channel)}
                  onCheckedChange={() => toggleChannel(channel)}
                />
                <Label
                  htmlFor={`channel-${channel}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {channel}
                </Label>
              </div>
            ))}
          </div>
        </div>

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
    </Card>
  );
}