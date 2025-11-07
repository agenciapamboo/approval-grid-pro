import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeInput } from "@/components/ui/time-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onSuccess: () => void;
}

export function EditContentDialog({ open, onOpenChange, contentId, onSuccess }: EditContentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("12:00");
  const [status, setStatus] = useState("draft");
  const [type, setType] = useState("feed");
  const [channels, setChannels] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, contentId]);

  const loadContent = async () => {
    try {
      setLoading(true);

      // Buscar dados do conteúdo
      const { data: content, error: contentError } = await supabase
        .from("contents")
        .select("*")
        .eq("id", contentId)
        .single();

      if (contentError) throw contentError;

      // Buscar legenda
      const { data: textData } = await supabase
        .from("content_texts")
        .select("caption")
        .eq("content_id", contentId)
        .eq("version", content.version)
        .single();

      // Buscar mídia
      const { data: mediaData } = await supabase
        .from("content_media")
        .select("src_url")
        .eq("content_id", contentId)
        .order("order_index")
        .limit(1)
        .single();

      // Preencher formulário
      setTitle(content.title || "");
      setCaption(textData?.caption || "");
      setDate(new Date(content.date));
      setTime(format(new Date(content.date), "HH:mm"));
      setStatus(content.status);
      setType(content.type);
      setChannels(content.channels || []);
      setCurrentMediaUrl(mediaData?.src_url || "");

    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do conteúdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChannelToggle = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validações
      if (!title.trim()) {
        toast({
          title: "Título obrigatório",
          description: "Por favor, informe um título para o conteúdo",
          variant: "destructive",
        });
        return;
      }

      // Combinar data e hora
      const [hours, minutes] = time.split(":");
      const dateTime = new Date(date);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Atualizar conteúdo
      const { error: updateError } = await supabase
        .from("contents")
        .update({
          title,
          date: dateTime.toISOString(),
          status: status as "draft" | "in_review" | "approved" | "changes_requested",
          type: type as "feed" | "story" | "reels" | "carousel" | "image",
          channels,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contentId);

      if (updateError) throw updateError;

      // Atualizar legenda
      const { data: contentData } = await supabase
        .from("contents")
        .select("version")
        .eq("id", contentId)
        .single();

      if (caption.trim()) {
        const { error: captionError } = await supabase
          .from("content_texts")
          .upsert({
            content_id: contentId,
            version: contentData?.version || 1,
            caption,
          });

        if (captionError) throw captionError;
      }

      // Upload de nova mídia se fornecida
      if (mediaFile) {
        setUploading(true);
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${contentId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("content-media")
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        // Salvar apenas o caminho no bucket (não URL pública)
        const { publicUrl } = { publicUrl: filePath };

        // Remover mídia antiga
        const { data: oldMedia } = await supabase
          .from("content_media")
          .select("src_url")
          .eq("content_id", contentId);

        if (oldMedia && oldMedia.length > 0) {
          await supabase
            .from("content_media")
            .delete()
            .eq("content_id", contentId);

          // Deletar arquivos antigos do storage
          for (const media of oldMedia) {
            const oldPath = media.src_url.includes('/content-media/') ? media.src_url.split('/content-media/')[1] : media.src_url;
            if (oldPath) {
              await supabase.storage.from('content-media').remove([oldPath]);
            }
          }
        }

        // Inserir nova mídia
        const { error: mediaError } = await supabase
          .from("content_media")
          .insert({
            content_id: contentId,
            src_url: publicUrl,
            kind: mediaFile.type.startsWith('video/') ? 'video' : 'image',
            order_index: 0,
          });

        if (mediaError) throw mediaError;
      }

      toast({
        title: "Conteúdo atualizado",
        description: "As alterações foram salvas com sucesso",
      });

      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conteúdo</DialogTitle>
          <DialogDescription>
            Altere os dados do conteúdo abaixo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Post sobre produto X"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="carousel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_review">Em Revisão</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="changes_requested">Ajustes Solicitados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(date, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <TimeInput
                  value={time}
                  onChange={setTime}
                />
              </div>
            </div>

            {/* Plataformas */}
            <div className="space-y-2">
              <Label>Plataformas</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Instagram', 'Facebook', 'LinkedIn', 'Twitter'].map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={channels.includes(platform)}
                      onCheckedChange={() => handleChannelToggle(platform)}
                    />
                    <label
                      htmlFor={platform}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {platform}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Legenda */}
            <div className="space-y-2">
              <Label htmlFor="caption">Legenda</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Digite a legenda do post..."
                className="min-h-[120px]"
              />
            </div>

            {/* Mídia Atual e Upload */}
            <div className="space-y-2">
              <Label>Mídia</Label>
              {currentMediaUrl && !mediaFile && (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  {currentMediaUrl.includes('.mp4') || currentMediaUrl.includes('video') ? (
                    <video src={currentMediaUrl} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={currentMediaUrl} alt="Mídia atual" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setMediaFile(file);
                  }}
                  className="hidden"
                  id="media-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('media-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {mediaFile ? mediaFile.name : "Substituir mídia"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || uploading}>
            {uploading ? "Enviando mídia..." : loading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
