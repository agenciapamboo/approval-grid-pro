import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditCaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  currentCaption: string;
  onSuccess: () => void;
  sessionToken?: string;
}

export function EditCaptionDialog({
  open,
  onOpenChange,
  contentId,
  currentCaption,
  onSuccess,
  sessionToken,
}: EditCaptionDialogProps) {
  const [caption, setCaption] = useState(currentCaption);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update caption when currentCaption changes
  useEffect(() => {
    setCaption(currentCaption);
  }, [currentCaption, open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (sessionToken) {
        // Approver flow - call edge function
        const { data, error } = await supabase.functions.invoke('approver-edit-caption', {
          body: {
            session_token: sessionToken,
            content_id: contentId,
            caption: caption
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Erro ao editar legenda');

        toast({
          title: "Legenda atualizada!",
          description: `Nova versão ${data.version} criada com sucesso.`,
        });
      } else {
        // Authenticated user flow - increment version and insert new caption
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: content } = await supabase
          .from('contents')
          .select('version')
          .eq('id', contentId)
          .single();

        if (!content) throw new Error('Conteúdo não encontrado');

        const newVersion = (content.version || 1) + 1;

        // Insert new caption version
        const { error: insertError } = await supabase
          .from('content_texts')
          .insert({
            content_id: contentId,
            version: newVersion,
            caption,
            edited_by_user_id: user?.id,
            edited_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        // Update content version
        const { error: updateError } = await supabase
          .from('contents')
          .update({ version: newVersion })
          .eq('id', contentId);

        if (updateError) throw updateError;

        toast({
          title: "Legenda atualizada!",
          description: `Nova versão ${newVersion} criada com sucesso.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao editar legenda:', error);
      toast({
        title: "Erro ao editar legenda",
        description: error instanceof Error ? error.message : "Não foi possível editar a legenda",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Legenda</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias na legenda. Uma nova versão será criada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Legenda</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              disabled={loading}
              placeholder="Digite a legenda aqui..."
            />
            <p className="text-xs text-muted-foreground">
              {caption.length} caracteres
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setCaption(currentCaption);
            }} 
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
