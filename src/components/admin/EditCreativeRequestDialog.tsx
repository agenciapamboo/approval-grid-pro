import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileEdit } from "lucide-react";

interface EditCreativeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any | null;
}

export function EditCreativeRequestDialog({ open, onOpenChange, request }: EditCreativeRequestDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    text: "",
    caption: "",
    observations: "",
    reference_files: [] as string[],
  });

  useEffect(() => {
    if (request?.payload) {
      setFormData({
        title: request.payload.title || "",
        type: request.payload.type || "",
        text: request.payload.text || "",
        caption: request.payload.caption || "",
        observations: request.payload.observations || "",
        reference_files: request.payload.reference_files || [],
      });
    }
  }, [request]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setLoading(true);

    try {
      // Upload new files and append to references
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${request.client_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('content-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-media')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const newPayload = {
        ...request.payload,
        title: formData.title,
        type: formData.type,
        text: formData.text,
        caption: formData.caption,
        observations: formData.observations,
        reference_files: [...(formData.reference_files || []), ...uploadedUrls],
        version: (request.payload?.version || 1) + 1,
        history: [
          ...(request.payload?.history || []),
          {
            at: new Date().toISOString(),
            changes: {
              title: request.payload?.title !== formData.title ? { from: request.payload?.title, to: formData.title } : undefined,
              type: request.payload?.type !== formData.type ? { from: request.payload?.type, to: formData.type } : undefined,
              text: request.payload?.text !== formData.text ? { from: request.payload?.text, to: formData.text } : undefined,
              caption: request.payload?.caption !== formData.caption ? { from: request.payload?.caption, to: formData.caption } : undefined,
              observations: request.payload?.observations !== formData.observations ? { from: request.payload?.observations, to: formData.observations } : undefined,
              added_files: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            }
          }
        ]
      };

      const { error } = await supabase
        .from('notifications')
        .update({ payload: newPayload })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Solicitação atualizada',
        description: 'As alterações foram salvas e a versão foi incrementada.',
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao atualizar solicitação:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a solicitação.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileEdit className="h-6 w-6 text-primary" />
            Editar Solicitação
          </DialogTitle>
          <DialogDescription>Atualize as informações do briefing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select required value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
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
            <Textarea id="text" value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Informações para a legenda</Label>
            <Textarea id="caption" value={formData.caption} onChange={(e) => setFormData({ ...formData, caption: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Outras observações</Label>
            <Textarea id="observations" value={formData.observations} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} />
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
                id="file-upload-edit"
              />
              <label htmlFor="file-upload-edit" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Adicionar novas imagens para referência</p>
              </label>
              {formData.reference_files?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {formData.reference_files.map((url, i) => (
                    <img key={i} src={url} alt={`ref-${i}`} className="w-full h-24 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">Cancelar</Button>
            <Button type="submit" variant="success" disabled={loading} className="flex-1">{loading ? 'Salvando...' : 'Salvar alterações'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
