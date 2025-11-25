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
      // Verificar sessão ativa e renovar se necessário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error("Sua sessão expirou. Por favor, faça login novamente.", {
          description: "Redirecionando para a página de login..."
        });
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
        
        setLoading(false);
        return;
      }

      const fullContext = {
        ...context,
        ...(captionContext || {}),
      };

      console.log('Calling generate-caption with:', { clientId, contentType, context: fullContext });

      // Garantir que o token JWT seja enviado no header Authorization
      const headers: Record<string, string> = {};
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke('generate-caption', {
        headers,
        body: {
          clientId,
          contentType,
          context: fullContext,
        },
      });

      // Tratar erros da Edge Function
      if (error) {
        console.error('Error from Edge Function:', error);
        console.error('Error object:', JSON.stringify(error, null, 2));
        
        // Tentar extrair mensagem de erro
        let errorMessage = 'Erro ao gerar sugestões';
        let errorDetails = '';
        
        // Verificar se o erro tem uma mensagem direta
        if ((error as any)?.message) {
          errorDetails = (error as any).message;
        }
        
        // Verificar se há dados no erro que podem conter a mensagem
        if ((error as any)?.error) {
          errorMessage = (error as any).error;
          errorDetails = (error as any).error;
        }
        
        // Se há um objeto de contexto com resposta
        const errorContext = (error as any)?.context;
        if (errorContext) {
          // Tentar extrair mensagem do contexto
          if (errorContext.message) {
            errorDetails = errorContext.message;
          }
          
          // Se há uma resposta no contexto, tentar extrair JSON
          if (errorContext.response) {
            try {
              const clonedResponse = errorContext.response.clone();
              const errorResponse = await clonedResponse.json().catch(() => null);
              if (errorResponse) {
                errorMessage = errorResponse.error || errorMessage;
                errorDetails = errorResponse.details || errorResponse.error || errorDetails;
              } else {
                // Tentar como texto
                const errorText = await clonedResponse.text().catch(() => null);
                if (errorText) {
                  try {
                    const parsed = JSON.parse(errorText);
                    errorMessage = parsed.error || errorMessage;
                    errorDetails = parsed.details || parsed.error || errorDetails;
                  } catch {
                    errorDetails = errorText || errorDetails;
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
          }
        }
        
        // Se ainda não temos detalhes, usar mensagem padrão
        if (!errorDetails || errorDetails === errorMessage) {
          errorDetails = errorMessage || 'Não foi possível gerar sugestões. Verifique sua conexão e tente novamente.';
        }
        
        throw new Error(errorDetails);
      }

      // Verificar se a resposta contém erro (mesmo com status 200)
      if (data?.error) {
        const errorMessage = data.error || 'Erro desconhecido';
        const errorDetails = data.details || '';
        console.error('Error in response data:', { error: errorMessage, details: errorDetails });
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
