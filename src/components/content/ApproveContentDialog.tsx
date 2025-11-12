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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApproveContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onSuccess: () => void;
  sessionToken?: string;
}

export function ApproveContentDialog({
  open,
  onOpenChange,
  contentId,
  onSuccess,
  sessionToken,
}: ApproveContentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (sessionToken) {
        // Approver flow - call edge function
        const { data, error } = await supabase.functions.invoke('approver-approve-content', {
          body: {
            session_token: sessionToken,
            content_id: contentId
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Erro ao aprovar conteúdo');

        toast({
          title: "Conteúdo aprovado!",
          description: "O conteúdo foi aprovado com sucesso.",
        });
      } else {
        // Authenticated user flow - direct database update
        const { error } = await supabase
          .from('contents')
          .update({ status: 'approved' })
          .eq('id', contentId);

        if (error) throw error;

        toast({
          title: "Conteúdo aprovado!",
          description: "O conteúdo foi aprovado com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao aprovar conteúdo:', error);
      toast({
        title: "Erro ao aprovar",
        description: error instanceof Error ? error.message : "Não foi possível aprovar o conteúdo",
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
          <DialogTitle>Aprovar Conteúdo</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja aprovar este conteúdo? Esta ação será registrada no histórico.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Aprovando..." : "Aprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
