import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseImageAnalysisProps {
  clientId: string;
  imageUrl: string;
}

export function useImageAnalysis({ clientId, imageUrl }: UseImageAnalysisProps) {
  const [description, setDescription] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const analyzeImage = async () => {
    if (!clientId || !imageUrl) {
      toast.error("Dados incompletos para análise");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('generate-image-analysis', {
        body: {
          clientId,
          imageUrl,
        },
      });

      if (error) throw error;

      if (data.limitReached) {
        toast.error("Limite de uso de IA atingido para este mês", {
          description: "Considere fazer upgrade do plano para mais usos de IA"
        });
        return;
      }

      setDescription(data.description || "");
      setHashtags(data.hashtags || []);
      setFromCache(data.fromCache || false);

      if (data.fromCache) {
        toast.success("Análise gerada (cache)", {
          description: "Não contabilizado no limite mensal"
        });
      } else {
        toast.success("Imagem analisada com sucesso");
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error("Erro ao analisar imagem", {
        description: error instanceof Error ? error.message : "Tente novamente"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => {
    setDescription("");
    setHashtags([]);
    setFromCache(false);
  };

  return {
    description,
    hashtags,
    loading,
    fromCache,
    analyzeImage,
    clearAnalysis,
  };
}
