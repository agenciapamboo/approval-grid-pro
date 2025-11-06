import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2 } from "lucide-react";

export function GenerateThumbnailsButton() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      toast({
        title: "Gerando miniaturas",
        description: "Processando conteúdos existentes...",
      });

      const { data, error } = await supabase.functions.invoke('generate-thumbnails');

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Miniaturas geradas",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Erro ao gerar miniaturas');
      }

    } catch (error) {
      console.error('Erro ao gerar miniaturas:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar miniaturas",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={generating}
      variant="outline"
      size="sm"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <ImagePlus className="w-4 h-4 mr-2" />
          Gerar Miniaturas Antigas
        </>
      )}
    </Button>
  );
}
