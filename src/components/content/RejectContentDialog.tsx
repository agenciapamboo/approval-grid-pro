import { useState } from "react";
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

interface RejectContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onSuccess: () => void;
  sessionToken?: string;
}

export function RejectContentDialog({
  open,
  onOpenChange,
  contentId,
  onSuccess,
  sessionToken,
}: RejectContentDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da reprovação.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (sessionToken) {
        // Approver flow - call edge function
        const { data, error } = await supabase.functions.invoke('approver-reject-content', {
          body: {
            session_token: sessionToken,
            content_id: contentId,
            reason: reason.trim()
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Erro ao reprovar conteúdo');

        toast({
          title: "Conteúdo reprovado",
          description: "O conteúdo foi reprovado e o motivo foi registrado.",
        });
      } else {
        // Authenticated user flow - direct database update + comment
        const { data: { user } } = await supabase.auth.getUser();
        
        // Update to changes_requested instead (rejected não existe no enum)
        const { error: updateError } = await supabase
          .from('contents')
          .update({ status: 'changes_requested' as any })
          .eq('id', contentId);

        if (updateError) throw updateError;

        // Add rejection comment
        const { data: content } = await supabase
          .from('contents')
          .select('version')
          .eq('id', contentId)
          .single();

        await supabase.from('comments').insert({
          content_id: contentId,
          body: `Reprovado: ${reason}`,
          author_user_id: user?.id,
          version: content?.version || 1,
          is_adjustment_request: false
        });

        toast({
          title: "Conteúdo reprovado",
          description: "O conteúdo foi reprovado e o motivo foi registrado.",
        });
      }

      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (error) {
      console.error('Erro ao reprovar conteúdo:', error);
      toast({
        title: "Erro ao reprovar",
        description: error instanceof Error ? error.message : "Não foi possível reprovar o conteúdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar Conteúdo</DialogTitle>
          <DialogDescription>
            Informe o motivo da reprovação. Esta informação será registrada no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Reprovação *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da reprovação..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }} 
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReject} 
            disabled={loading || !reason.trim()}
          >
            {loading ? "Reprovando..." : "Reprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
