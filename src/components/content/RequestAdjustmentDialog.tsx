import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequestAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onSuccess: () => void;
  approvalToken?: string;
}

export function RequestAdjustmentDialog({
  open,
  onOpenChange,
  contentId,
  onSuccess,
  approvalToken,
}: RequestAdjustmentDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o que deve ser ajustado na imagem",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fluxo autenticado normal
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

        // Pegar a versão atual do conteúdo
        const { data: contentData } = await supabase
          .from("contents")
          .select("version")
          .eq("id", contentId)
          .single();

        // Criar comentário de ajuste
        const { error: commentError } = await supabase
          .from("comments")
          .insert({
            content_id: contentId,
            author_user_id: user.id,
            body: details || reason,
            is_adjustment_request: true,
            adjustment_reason: reason,
            version: contentData?.version || 1,
          });

        if (commentError) throw commentError;

        // Atualizar status do conteúdo
        const { error: updateError } = await supabase
          .from("contents")
          .update({ status: "changes_requested" })
          .eq("id", contentId);

        if (updateError) throw updateError;

        // Buscar dados do conteúdo para notificação
        const { data: content } = await supabase
          .from("contents")
          .select("title, date, channels")
          .eq("id", contentId)
          .single();

        // Importar função de notificação
        const { createNotification } = await import("@/lib/notifications");

        // Disparar notificação de ajuste solicitado
        await createNotification('content.revised', contentId, {
          title: content?.title || '',
          date: content?.date || '',
          comment: details || reason,
          channels: content?.channels || [],
        });

        toast({
          title: "Ajuste solicitado",
          description: "A solicitação de ajuste foi enviada com sucesso",
        });

      setReason("");
      setDetails("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao solicitar ajuste:", error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar ajuste",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Ajuste</DialogTitle>
          <DialogDescription>
            Descreva o que deve ser ajustado neste conteúdo
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-destructive">
              O que deve ser ajustado na imagem? *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Exemplo: A cor do produto está diferente..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes adicionais (opcional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Adicione mais informações se necessário..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
