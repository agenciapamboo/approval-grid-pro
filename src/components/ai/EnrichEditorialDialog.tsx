import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnrichEditorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

export function EnrichEditorialDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: EnrichEditorialDialogProps) {
  const [monthContext, setMonthContext] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setMonthContext("");
      setCustomPrompt("");
      setLoading(false);
    }
  }, [open]);

  const handleEnrich = async () => {
    if (!monthContext.trim()) {
      toast.error("Por favor, descreva o contexto do mês");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;

      if (!jwt) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke('enrich-editorial-line', {
        body: { 
          clientId, 
          monthContext: monthContext.trim(),
          customPrompt: customPrompt.trim() || undefined,
          jwt 
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error("Não foi possível enriquecer a linha editorial.");
      }

      toast.success(
        data.tokens
          ? `Linha editorial enriquecida! (${data.tokens} tokens usados)`
          : "Linha editorial enriquecida com sucesso!"
      );
      setMonthContext("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error enriching editorial:', error);
      toast.error(error.message || "Erro ao enriquecer linha editorial");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            Enriquecer Linha Editorial com IA
          </DialogTitle>
          <DialogDescription>
            Informe eventos, datas importantes, tendências ou contexto específico do mês para enriquecer a linha editorial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="monthContext">
              Contexto do Mês
            </Label>
            <Textarea
              id="monthContext"
              placeholder="Ex: Dezembro - Natal, Black Friday, fim de ano, retrospectiva 2024..."
              value={monthContext}
              onChange={(e) => setMonthContext(e.target.value)}
              rows={6}
              disabled={loading}
            />
          </div>

          {/* Prompt Personalizado (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="customPrompt" className="text-sm font-medium">
              Prompt Personalizado <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <Textarea
              id="customPrompt"
              placeholder="Adicione instruções específicas para enriquecer a linha editorial. Ex: Foque em storytelling, use linguagem mais técnica, inclua mais CTA..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este campo permite personalizar o enriquecimento com instruções adicionais
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEnrich}
            disabled={loading || !monthContext.trim()}
            className="bg-green-500 hover:bg-green-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriquecendo...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enriquecer com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
