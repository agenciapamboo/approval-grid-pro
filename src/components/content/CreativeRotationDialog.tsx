import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, Archive, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreativeRotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  creativesLimit: number;
  currentCount: number;
  oldestContentTitle?: string;
  onRotationComplete?: () => void;
}

export function CreativeRotationDialog({
  open,
  onOpenChange,
  clientId,
  creativesLimit,
  currentCount,
  oldestContentTitle,
  onRotationComplete,
}: CreativeRotationDialogProps) {
  const navigate = useNavigate();
  const [isArchiving, setIsArchiving] = useState(false);

  const excessCount = currentCount - creativesLimit;

  const handleArchiveOldest = async () => {
    setIsArchiving(true);
    try {
      const { data, error } = await supabase.functions.invoke("archive-contents", {
        body: { clientId },
      });

      if (error) throw error;

      if (data?.archived_count > 0) {
        toast.success("Criativos arquivados com sucesso", {
          description: `${data.archived_count} criativo(s) mais antigo(s) foram arquivados. As mídias em tamanho completo foram removidas, mas os logs e miniaturas foram mantidos por 6 meses.`,
        });
        onRotationComplete?.();
        onOpenChange(false);
      } else {
        toast.info("Nenhum criativo foi arquivado");
      }
    } catch (error) {
      console.error("Error archiving contents:", error);
      toast.error("Erro ao arquivar criativos", {
        description: "Não foi possível arquivar os criativos antigos. Tente novamente.",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUpgrade = () => {
    navigate("/my-subscription");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-warning" />
            Limite de Criativos Atingido
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>
              Você atingiu o limite de <strong>{creativesLimit} criativos</strong> arquivados
              do seu plano. Atualmente você possui <strong>{currentCount} criativos</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Para cadastrar novos criativos, você pode:
            </p>
            <ul className="text-sm space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Arquivar os mais antigos:</strong> Os {excessCount} criativo(s) mais
                  antigo(s) serão movidos para o histórico de logs. As mídias em tamanho completo
                  serão removidas, mas as miniaturas e o histórico de interações serão mantidos
                  por 6 meses.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Fazer upgrade do plano:</strong> Aumente seu limite de criativos
                  arquivados e aproveite outros benefícios.
                </span>
              </li>
            </ul>
            {oldestContentTitle && (
              <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                Criativo mais antigo: <strong>{oldestContentTitle}</strong>
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleArchiveOldest}
            disabled={isArchiving}
            className="gap-2"
          >
            {isArchiving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Arquivando...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Arquivar Mais Antigos
              </>
            )}
          </Button>
          <AlertDialogAction onClick={handleUpgrade} className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Fazer Upgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
