import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContentSuggestion {
  title: string;
  description: string;
  type: 'feed' | 'reels' | 'carousel' | 'story';
  hashtags: string[];
}

interface UseContentSuggestionsProps {
  clientId: string;
  date: Date;
}

export function useContentSuggestions({ clientId, date }: UseContentSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const generateSuggestions = async () => {
    if (!clientId || !date) {
      toast.error("Dados incompletos para gerar sugestões");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('generate-content-suggestions', {
        body: {
          clientId,
          date: date.toISOString(),
        },
      });

      if (error) throw error;

      if (data.limitReached) {
        toast.error("Limite de uso de IA atingido para este mês", {
          description: "Considere fazer upgrade do plano para mais usos de IA"
        });
        return;
      }

      setSuggestions(data.suggestions || []);
      setFromCache(data.fromCache || false);

      if (data.fromCache) {
        toast.success("Sugestões geradas (cache)", {
          description: "Não contabilizado no limite mensal"
        });
      } else {
        toast.success("Sugestões geradas com sucesso");
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error("Erro ao gerar sugestões", {
        description: error instanceof Error ? error.message : "Tente novamente"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setFromCache(false);
  };

  return {
    suggestions,
    loading,
    fromCache,
    generateSuggestions,
    clearSuggestions,
  };
}