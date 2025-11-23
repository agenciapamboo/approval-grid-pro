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
import { Upload, CalendarIcon, Save, Loader2, X, Clock, FileText, ImageIcon, Images, Video, Smartphone, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
// triggerWebhook removido - webhooks agora são automáticos via triggers
import { createNotification } from "@/lib/notifications";
import { TimeInput } from "@/components/ui/time-input";
import { checkMonthlyPostsLimit, checkCreativesStorageLimit } from "@/lib/plan-limits";
import { CreativeRotationDialog } from "./CreativeRotationDialog";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { AILegendAssistant } from "./AILegendAssistant";
import { MediaAccessibility } from "./MediaAccessibility";

interface CreateContentCardProps {
  clientId: string;
  onContentCreated: () => void;
  category?: 'social' | 'avulso';
  initialDate?: Date;
  initialTitle?: string;
}

const CHANNELS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube'] as const;

export function CreateContentCard({ clientId, onContentCreated, category = 'social', initialDate, initialTitle }: CreateContentCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState(initialTitle || "");
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState("12:00");
  const [channels, setChannels] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [contentType, setContentType] = useState<'image' | 'carousel' | 'reels' | 'story' | 'feed'>('image');
  const [videoTypes, setVideoTypes] = useState<string[]>([]);
  const [reelsThumbnail, setReelsThumbnail] = useState<File | null>(null);
  const [reelsThumbnailPreview, setReelsThumbnailPreview] = useState<string>("");
  const [showRotationDialog, setShowRotationDialog] = useState(false);
  const [limitCheckData, setLimitCheckData] = useState<{ type: 'posts' | 'creatives'; limit: number; current: number } | null>(null);
  const [isContentPlan, setIsContentPlan] = useState(false);
  const [planDescription, setPlanDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { status } = useSubscriptionStatus();

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

    // Se o tipo for story e já existe arquivo, substituir ao invés de adicionar
    if (contentType === 'story' && files.length > 0) {
      toast({
        title: "Story permite apenas uma mídia",
        description: "O arquivo anterior foi substituído",
        variant: "default",
      });
      // Limpar arquivos anteriores
      previews.forEach(url => URL.revokeObjectURL(url));
      setFiles(validFiles.slice(0, 1));
      setPreviews([URL.createObjectURL(validFiles[0])]);
      setHasChanges(true);
      return;
    }

    // Para story, permitir apenas 1 arquivo
    if (contentType === 'story') {
      setFiles(validFiles.slice(0, 1));
      setPreviews([URL.createObjectURL(validFiles[0])]);
      setHasChanges(true);
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
    
    // Definir tipo de conteúdo baseado em múltiplos arquivos
    if (validFiles.length > 1) {
      setContentType('carousel');
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

  // Função para gerar thumbnail de imagem
  const generateImageThumbnail = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calcular dimensões mantendo proporção (320px de largura para melhor qualidade)
        const targetWidth = 320;
        const scaleFactor = targetWidth / img.width;
        const targetHeight = Math.round(img.height * scaleFactor);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Converter para blob com compressão
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.7 // 70% de qualidade para arquivo leve
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Função para gerar thumbnail de vídeo
  const generateVideoThumbnail = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadeddata = () => {
        // Capturar frame em 1 segundo (ou início do vídeo)
        video.currentTime = Math.min(1, video.duration);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calcular dimensões mantendo proporção (320px de largura para melhor qualidade)
        const targetWidth = 320;
        const scaleFactor = targetWidth / video.videoWidth;
        const targetHeight = Math.round(video.videoHeight * scaleFactor);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Desenhar frame do vídeo
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleSave = async () => {
    // Validação: título é obrigatório
    if (!title || !title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, preencha o título do conteúdo",
        variant: "destructive",
      });
      return;
    }

    // Validação: se for plano, não precisa de mídia
    if (!isContentPlan && files.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, adicione pelo menos uma mídia",
        variant: "destructive",
      });
      return;
    }
    
    // Se for plano, validar descrição
    if (isContentPlan && !planDescription.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, descreva o plano de conteúdo",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Data obrigatória",
        description: "Por favor, selecione uma data",
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

      // Criar datetime combinando data e hora (sem conversão de timezone)
      const [hours, minutes] = time.split(':').map(Number);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // String no formato ISO local com "T" para evitar parse UTC no front
      const dateTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      // Título é obrigatório (já validado acima)
      const contentTitle = title.trim();

      const { data: content, error: contentError } = await supabase
        .from("contents")
        .insert([{
          client_id: clientId,
          title: contentTitle,
          date: dateTimeString,
          type: contentType,
          status: 'draft' as const,
          owner_user_id: user.id,
          channels: channels,
          category: category,
          is_content_plan: isContentPlan,
          plan_description: isContentPlan ? planDescription : null,
        }])
        .select()
        .single();

      if (contentError) throw contentError;

      // Se for plano, não fazer upload de mídia
      if (isContentPlan) {
        // Salvar legenda se houver
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
          title: "Plano de conteúdo criado",
          description: "O plano foi salvo e está aguardando aprovação do cliente",
        });

        // Limpar formulário
        setIsContentPlan(false);
        setPlanDescription("");
        setCaption("");
        setTitle("");
        setChannels([]);
        setDate(initialDate);
        setTime("12:00");
        setHasChanges(false);
        onContentCreated();
        return;
      }

      // Upload de thumbnail se for reels e houver thumbnail
      let thumbUrl: string | null = null;
      if (contentType === 'reels' && reelsThumbnail) {
        const thumbExt = reelsThumbnail.name.split('.').pop();
        const thumbFileName = `${content.id}/thumb-${Date.now()}.${thumbExt}`;
        
        const { error: thumbUploadError } = await supabase.storage
          .from('content-media')
          .upload(thumbFileName, reelsThumbnail);

        if (thumbUploadError) {
          console.error("Erro ao fazer upload do thumbnail:", thumbUploadError);
          throw thumbUploadError;
        }

        // Armazenar apenas o caminho no bucket (não URL pública)
        thumbUrl = thumbFileName;
      }

      // Validação de tamanho de arquivo
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
      const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        const maxSizeLabel = isVideo ? '100MB' : '50MB';
        
        if (file.size > maxSize) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          const fileType = isVideo ? 'Vídeos' : 'Imagens';
          toast({ 
            title: 'Arquivo muito grande', 
            description: `O arquivo "${file.name}" tem ${sizeMB}MB. ${fileType} podem ter até ${maxSizeLabel}.`, 
            variant: 'destructive' 
          });
          throw new Error(`Arquivo ${file.name} excede o tamanho máximo permitido`);
        }
      }

      // Preparação e upload dos arquivos de mídia
      let filesToUpload = files;
      if (contentType === 'reels') {
        // Reels aceita apenas 1 arquivo (vídeo ou imagem)
        if (files.length > 1) {
          toast({ 
            title: 'Reels permite apenas um arquivo', 
            description: 'Apenas o primeiro arquivo será usado', 
            variant: 'default' 
          });
        }
        filesToUpload = [files[0]];
      }

      const videoIndex = filesToUpload.findIndex(f => f.type.startsWith('video/'));

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${content.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Erro ao fazer upload do arquivo:', uploadError);
          throw uploadError;
        }

        // Salvar apenas o caminho no bucket (não URL pública)
        const publicUrl = fileName;

        const mediaKind = file.type.startsWith('video/') ? 'video' : 'image';

        // Gerar thumbnail automático para todas as mídias com retry logic
        let autoThumbUrl: string | null = null;
        let retries = 2;

        while (retries >= 0) {
          try {
            console.log(`🖼️ Gerando thumbnail para ${file.name} (tentativa ${3 - retries}/3)...`);
            
            const thumbnailBlob = mediaKind === 'video' 
              ? await generateVideoThumbnail(file)
              : await generateImageThumbnail(file);

            const autoThumbFileName = `${content.id}/auto-thumb-${Date.now()}-${i}.jpg`;
            const { error: autoThumbUploadError } = await supabase.storage
              .from('content-media')
              .upload(autoThumbFileName, thumbnailBlob);

            if (!autoThumbUploadError) {
              autoThumbUrl = autoThumbFileName;
              console.log(`✅ Thumbnail gerado com sucesso: ${autoThumbFileName}`);
              break; // Success - exit retry loop
            }
            
            throw autoThumbUploadError;
          } catch (thumbError) {
            retries--;
            console.warn(`⚠️ Erro ao gerar/enviar thumbnail (tentativas restantes: ${retries}):`, thumbError);
            
            if (retries < 0) {
              console.error(`❌ Falha ao gerar thumbnail após 3 tentativas para ${file.name}`);
              // Continue sem thumbnail (não bloqueia criação de conteúdo)
            } else {
              // Wait 500ms before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // Determine if this is the primary thumbnail (first media item)
        const isPrimaryThumb = i === 0;

        const mediaData: any = {
          content_id: content.id,
          src_url: publicUrl,
          kind: mediaKind,
          order_index: i,
          size_bytes: file.size,
          thumb_url: autoThumbUrl, // Thumbnail gerado automaticamente
          is_primary_thumbnail: isPrimaryThumb, // Mark first media as primary
        };

        // Se for vídeo de reels E tiver um thumbnail manual, sobrescrever
        if (thumbUrl && videoIndex === i) {
          mediaData.thumb_url = thumbUrl;
        }

        const { error: mediaError } = await supabase
          .from('content_media')
          .insert(mediaData);

        if (mediaError) {
          console.error('Erro ao inserir registro de mídia:', mediaError);
          throw mediaError;
        }
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
      setTitle("");
      setDate(undefined);
      setTime("12:00");
      setChannels([]);
      setContentType('image');
      setVideoTypes([]);
      setReelsThumbnail(null);
      setReelsThumbnailPreview("");
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
      {/* Toggle para Plano de Conteúdo */}
      <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
        <Checkbox
          id="content-plan"
          checked={isContentPlan}
          onCheckedChange={(checked) => {
            setIsContentPlan(checked as boolean);
            setHasChanges(true);
          }}
        />
        <Label htmlFor="content-plan" className="cursor-pointer flex-1">
          <div className="flex flex-col">
            <span className="font-medium">Plano de Conteúdo</span>
            <span className="text-sm text-muted-foreground">
              Criar um roteiro/ideia para aprovação antes de produzir
            </span>
          </div>
        </Label>
      </div>

      {/* Se for plano, mostrar seletor de tipo e textarea para descrição */}
      {isContentPlan ? (
        <div className="space-y-4">
          {/* Seletor de tipo de mídia para plano */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Conteúdo</Label>
            <RadioGroup 
              value={contentType} 
              onValueChange={(value) => {
                setContentType(value as typeof contentType);
                setHasChanges(true);
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="plan-type-image" />
                <Label htmlFor="plan-type-image" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Imagem (post estático)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reels" id="plan-type-reels" />
                <Label htmlFor="plan-type-reels" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Reels (vídeo vertical 9:16)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="story" id="plan-type-story" />
                <Label htmlFor="plan-type-story" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Story (imagem ou vídeo vertical 9:16)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="carousel" id="plan-type-carousel" />
                <Label htmlFor="plan-type-carousel" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Images className="h-4 w-4" />
                  Carrossel (múltiplas imagens)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feed" id="plan-type-feed" />
                <Label htmlFor="plan-type-feed" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Feed (vídeo normal)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Selecione o formato que será utilizado na produção final
            </p>
          </div>

          {/* Textarea de descrição do plano */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Descrição do Plano</span>
            </div>
            <Textarea
              id="plan-description"
              value={planDescription}
              onChange={(e) => {
                setPlanDescription(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Descreva a ideia do conteúdo, roteiro, conceito criativo, etc."
              className="min-h-[160px]"
            />
            <p className="text-xs text-muted-foreground">
              Esta descrição será enviada para aprovação do cliente antes da produção.
            </p>
          </div>
        </div>
      ) : (
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
                {(contentType !== 'story' && files.length < 10) && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {contentType === 'story' 
                  ? 'Story permite apenas 1 mídia' 
                  : `Arraste para reordenar • ${files.length}/10 imagens`
                }
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
      )}

      <div className="p-4 space-y-3">
        {/* Seletor de tipo de conteúdo - sempre visível */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Conteúdo</Label>
            <RadioGroup 
              value={contentType} 
              onValueChange={(value) => {
                const newType = value as typeof contentType;
                // Se mudou para story e tem mais de 1 arquivo, manter apenas o primeiro
                if (newType === 'story' && files.length > 1) {
                  const firstFile = files[0];
                  const firstPreview = previews[0];
                  // Limpar outros previews
                  previews.slice(1).forEach(url => URL.revokeObjectURL(url));
                  setFiles([firstFile]);
                  setPreviews([firstPreview]);
                  toast({
                    title: "Story permite apenas uma mídia",
                    description: "Apenas o primeiro arquivo foi mantido",
                  });
                }
                setContentType(newType);
                setHasChanges(true);
              }}
            >
              {files.length > 1 ? (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="carousel" id="type-carousel" />
                  <Label htmlFor="type-carousel" className="text-sm font-normal cursor-pointer">
                    Carrossel ({files.length} itens)
                  </Label>
                </div>
              ) : files[0].type.startsWith('video/') ? (
                <>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reels" id="type-reels" />
                    <Label htmlFor="type-reels" className="text-sm font-normal cursor-pointer">
                      Reels (vertical 9:16)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="story" id="type-story-video" />
                    <Label htmlFor="type-story-video" className="text-sm font-normal cursor-pointer">
                      Story (vertical 9:16)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="feed" id="type-feed-video" />
                    <Label htmlFor="type-feed-video" className="text-sm font-normal cursor-pointer">
                      Feed (vídeo normal)
                    </Label>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reels" id="type-reels-image" />
                    <Label htmlFor="type-reels-image" className="text-sm font-normal cursor-pointer">
                      Reels (imagem vertical 9:16)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="feed" id="type-feed" />
                    <Label htmlFor="type-feed" className="text-sm font-normal cursor-pointer">
                      Feed (post normal)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="story" id="type-story" />
                    <Label htmlFor="type-story" className="text-sm font-normal cursor-pointer">
                      Story (vertical 9:16)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="image" id="type-image" />
                    <Label htmlFor="type-image" className="text-sm font-normal cursor-pointer">
                      Outro formato
                    </Label>
                  </div>
                </>
              )}
            </RadioGroup>
        </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Título *</Label>
          <Input
            placeholder="Ex: Lançamento do produto X"
            value={title}
            required
            onChange={(e) => {
              setTitle(e.target.value);
              setHasChanges(true);
            }}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco para gerar automaticamente baseado na data
          </p>
        </div>

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
        
        {/* Assistente de IA para Legendas */}
        {!isContentPlan && (
          <AILegendAssistant
            clientId={clientId}
            contentType={contentType === 'feed' ? 'post' : contentType === 'reels' ? 'reels' : contentType === 'story' ? 'stories' : 'post'}
            context={{ title, category }}
            onSelectSuggestion={(suggestion) => setCaption(suggestion)}
          />
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
        
        {/* Intérprete de Imagem com IA - mostra apenas se tiver imagens carregadas */}
        {!isContentPlan && files.length > 0 && files.some(f => f.type.startsWith('image/')) && (
          <MediaAccessibility
            clientId={clientId}
            imageUrl={previews.find((_, i) => files[i].type.startsWith('image/')) || ''}
          />
        )}

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