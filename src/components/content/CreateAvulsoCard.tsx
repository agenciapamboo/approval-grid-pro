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

interface CreateAvulsoCardProps {
  clientId: string;
  onContentCreated: () => void;
}

export function CreateAvulsoCard({ clientId, onContentCreated }: CreateAvulsoCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>();
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          status: 'draft' as const,
          owner_user_id: user.id,
          category: 'avulso',
          channels: [],
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      if (files.length > 0) {
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

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-muted/30 relative">
        {files.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging ? "bg-primary/10 border-2 border-primary border-dashed" : "hover:bg-muted/50"
            )}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Mídia opcional
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique ou arraste arquivos
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                {files[index].type.startsWith('video/') ? (
                  <video src={preview} className="w-full h-full object-cover rounded" />
                ) : (
                  <img src={preview} alt="" className="w-full h-full object-cover rounded" />
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {previews.length < 4 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center cursor-pointer hover:bg-muted/50"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
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
                setDate(newDate);
                setHasChanges(true);
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
    </Card>
  );
}
