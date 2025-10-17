import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CalendarIcon, Save, Loader2, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { triggerWebhook } from "@/lib/webhooks";
import { createNotification } from "@/lib/notifications";
import { TimeInput } from "@/components/ui/time-input";

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
  const [time, setTime] = useState("12:00");
  const [channels, setChannels] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [contentType, setContentType] = useState<'image' | 'carousel' | 'reels' | 'story' | 'feed'>('image');
  const [videoTypes, setVideoTypes] = useState<string[]>([]);
  const [reelsThumbnail, setReelsThumbnail] = useState<File | null>(null);
  const [reelsThumbnailPreview, setReelsThumbnailPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
      if (reelsThumbnailPreview) URL.revokeObjectURL(reelsThumbnailPreview);
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

  const detectContentType = async (file: File): Promise<'image' | 'carousel' | 'story' | 'feed'> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          
          // 9:16 (0.5625) - Story/vertical
          if (aspectRatio >= 0.5 && aspectRatio <= 0.6) {
            resolve('story');
          }
          // 4:5 (0.8) - Feed
          else if (aspectRatio >= 0.75 && aspectRatio <= 0.85) {
            resolve('feed');
          }
          // Outras proporções - Image
          else {
            resolve('image');
          }
        };
        img.src = URL.createObjectURL(file);
      } else {
        resolve('image');
      }
    });
  };

  const handleFiles = async (newFiles: File[]) => {
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
    
    // Detectar tipo de conteúdo automaticamente
    if (validFiles.length > 1) {
      setContentType('carousel');
    } else if (validFiles[0].type.startsWith('video/')) {
      // Vídeos permanecem sem tipo definido até o usuário escolher
      setVideoTypes([]);
    } else {
      const detectedType = await detectContentType(validFiles[0]);
      setContentType(detectedType);
    }
    
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

  const toggleVideoType = (type: string) => {
    setVideoTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    // Se selecionou reels, atualiza contentType
    if (type === 'reels') {
      setContentType('reels');
    }
    setHasChanges(true);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem",
          variant: "destructive",
        });
        return;
      }
      setReelsThumbnail(file);
      if (reelsThumbnailPreview) URL.revokeObjectURL(reelsThumbnailPreview);
      setReelsThumbnailPreview(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  const removeThumbnail = () => {
    if (reelsThumbnailPreview) URL.revokeObjectURL(reelsThumbnailPreview);
    setReelsThumbnail(null);
    setReelsThumbnailPreview("");
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

    // Validar tipo de vídeo se for vídeo
    if (files.length === 1 && files[0].type.startsWith('video/') && videoTypes.length === 0) {
      toast({
        title: "Tipo de vídeo obrigatório",
        description: "Por favor, selecione ao menos um tipo para o vídeo (Story, Reels ou ambos)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Determinar tipo de conteúdo
      let finalContentType = contentType;
      if (files.length === 1 && files[0].type.startsWith('video/')) {
        // Para vídeos, usar o primeiro tipo selecionado
        finalContentType = videoTypes[0] as typeof finalContentType;
      }

      // Criar datetime combinando data e hora (sem conversão de timezone)
      const [hours, minutes] = time.split(':').map(Number);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // String no formato ISO local com "T" para evitar parse UTC no front
      const dateTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const { data: content, error: contentError } = await supabase
        .from("contents")
        .insert([{
          client_id: clientId,
          title: `Conteúdo ${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          date: dateTimeString,
          type: finalContentType,
          status: 'draft' as const,
          owner_user_id: user.id,
          channels: channels,
          category: category,
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      // Upload de thumbnail se for reels e houver thumbnail
      let thumbUrl = null;
      if (finalContentType === 'reels' && reelsThumbnail) {
        const thumbExt = reelsThumbnail.name.split('.').pop();
        const thumbFileName = `${content.id}/thumb-${Date.now()}.${thumbExt}`;
        
        const { error: thumbUploadError } = await supabase.storage
          .from('content-media')
          .upload(thumbFileName, reelsThumbnail);

        if (thumbUploadError) throw thumbUploadError;

        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(thumbFileName);
        
        thumbUrl = thumbPublicUrl;
      }

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
            thumb_url: thumbUrl,
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
        description: "O conteúdo foi salvo como rascunho",
      });

      setFiles([]);
      setPreviews([]);
      setCaption("");
      setDate(undefined);
      setTime("12:00");
      setChannels([]);
      setContentType('image');
      setVideoTypes([]);
      setReelsThumbnail(null);
      setReelsThumbnailPreview("");
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
        <div className="p-3 space-y-2">
          {files.length > 0 ? (
            <>
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
            </>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full min-h-[160px] flex flex-col items-center justify-center cursor-pointer transition-colors rounded border-2 border-dashed",
                isDragging ? "bg-primary/10 border-primary" : "border-muted-foreground/30 hover:bg-muted/50"
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground text-center px-4">
                Clique ou arraste
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Até 10 arquivos
              </p>
            </div>
          )}
        </div>
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
        <div className="space-y-2">
          <Label className="text-sm font-medium">Data e hora</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
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
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-start text-left font-normal"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {time}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <div className="flex flex-col items-center gap-2">
                  <Label className="text-sm font-medium">Hora</Label>
                  <TimeInput
                    value={time}
                    onChange={(newTime) => {
                      setTime(newTime);
                      setHasChanges(true);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Textarea
          placeholder="Escreva a legenda..."
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          className="min-h-[100px]"
        />

        {/* Tipo de conteúdo para imagens */}
        {files.length === 1 && files[0] && !files[0].type.startsWith('video/') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de conteúdo</Label>
            <RadioGroup value={contentType} onValueChange={(value) => setContentType(value as typeof contentType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feed" id="type-feed" />
                <Label htmlFor="type-feed" className="text-sm font-normal cursor-pointer">
                  Feed (4:5)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="story" id="type-story" />
                <Label htmlFor="type-story" className="text-sm font-normal cursor-pointer">
                  Story (9:16)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="type-image" />
                <Label htmlFor="type-image" className="text-sm font-normal cursor-pointer">
                  Imagem (Outro)
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Tipo de vídeo - checkbox múltipla */}
        {files.length === 1 && files[0] && files[0].type.startsWith('video/') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de vídeo (selecione ao menos um)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="video-story"
                  checked={videoTypes.includes('story')}
                  onCheckedChange={() => toggleVideoType('story')}
                />
                <Label htmlFor="video-story" className="text-sm font-normal cursor-pointer">
                  Story (9:16)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="video-reels"
                  checked={videoTypes.includes('reels')}
                  onCheckedChange={() => toggleVideoType('reels')}
                />
                <Label htmlFor="video-reels" className="text-sm font-normal cursor-pointer">
                  Reels
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Upload de capa para Reels */}
        {contentType === 'reels' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Capa do Reels (opcional)</Label>
            {reelsThumbnailPreview ? (
              <div className="relative w-32 h-32">
                <img src={reelsThumbnailPreview} alt="Capa" className="w-full h-full object-cover rounded border" />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
          </div>
        )}

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

        <Button
          onClick={handleSave}
          disabled={uploading || !hasChanges}
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
      </div>
    </Card>
  );
}