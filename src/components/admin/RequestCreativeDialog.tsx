import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles } from "lucide-react";
import { triggerWebhook } from "@/lib/webhooks";

interface RequestCreativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  agencyId: string;
  onSuccess?: () => void;
  initialDate?: Date | null;
}

export function RequestCreativeDialog({ open, onOpenChange, clientId, agencyId, onSuccess, initialDate }: RequestCreativeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    text: "",
    caption: "",
    observations: "",
    deadline: initialDate ? initialDate.toISOString().split('T')[0] : "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload files if any
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${clientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Create a creative request record
      const requestData = {
        ...formData,
        client_id: clientId,
        agency_id: agencyId,
        reference_files: uploadedUrls,
        job_status: 'pending',
        version: 1,
        history: [],
      };

      // Store in notifications table
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          event: 'novojob',
          client_id: clientId,
          agency_id: agencyId,
          channel: 'webhook',
          status: 'pending',
          payload: requestData,
        })
        .select()
        .single();

      if (notificationError) throw notificationError;

      // Trigger webhook
      await triggerWebhook('novojob', notificationData.id, clientId, agencyId);

      toast({
        title: "✅ Solicitação enviada com sucesso!",
        description: "A agência foi notificada sobre sua solicitação.",
      });

      onSuccess?.();
      onOpenChange(false);
      setFormData({ title: "", type: "", text: "", caption: "", observations: "", deadline: "" });
      setFiles([]);
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a solicitação.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Solicitar Criativo
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes do criativo que você precisa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Post para lançamento de produto"
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select required value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="glass">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="carrossel">Carrossel</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="stories">Stories</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Texto na arte</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Texto que deve aparecer na imagem/vídeo"
              className="glass min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Informações para a legenda</Label>
            <Textarea
              id="caption"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              placeholder="Informações que devem ser incluídas na legenda do post"
              className="glass min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Outras observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Qualquer informação adicional relevante"
              className="glass min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label>Imagens de referência</Label>
            <div className="glass rounded-xl p-6 border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Adicione imagens para o criativo ou referências visuais
                </p>
                {files.length > 0 && (
                  <p className="text-xs text-primary">{files.length} arquivo(s) selecionado(s)</p>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="success"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
