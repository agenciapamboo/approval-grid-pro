import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseAILegendAssistantProps {
  clientId: string;
  contentType: 'post' | 'reels' | 'stories';
  context?: {
    title?: string;
    category?: string;
    description?: string;
  };
}

export function useAILegendAssistant({ clientId, contentType, context }: UseAILegendAssistantProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const generateSuggestions = async (captionContext?: any) => {
    if (!clientId) {
      toast.error("Cliente não identificado");
      return;
    }

    setLoading(true);
    try {
      // Buscar sessão ativa para pegar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const fullContext = {
        ...context,
        ...(captionContext || {}),
      };

      // Passar Authorization header explicitamente
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          clientId,
          contentType,
          context: fullContext,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
