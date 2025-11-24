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
      // Verificar sessão ativa
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

      // O Supabase client automaticamente envia o token no header Authorization
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          clientId,
          contentType,
          context: fullContext,
        },
      });

      if (error) {
        console.error('Error from Edge Function:', error);
        // Se o erro contém uma mensagem ou detalhes, exibir
        const errorMessage = error.message || error.error || 'Erro desconhecido';
        const errorDetails = error.details || error.error_description || '';
        throw new Error(errorDetails || errorMessage);
      }

      // Verificar se a resposta contém erro
      if (data?.error) {
        const errorMessage = data.error || 'Erro desconhecido';
        const errorDetails = data.details || '';
        throw new Error(errorDetails || errorMessage);
      }

      if (data?.limitReached) {
        toast.error("Limite de uso de IA atingido para este mês", {
          description: "Considere fazer upgrade do plano para mais usos de IA"
        });
        return;
      }

      if (!data?.suggestions) {
        throw new Error('Resposta inválida da função: sugestões não encontradas');
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
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      const errorMessage = error?.message || error?.error || error?.details || 'Erro ao gerar sugestões. Tente novamente.';
      toast.error("Erro ao gerar sugestões", {
        description: errorMessage
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
