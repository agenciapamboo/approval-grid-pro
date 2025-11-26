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
      // ✅ CORREÇÃO 1: Garantir sessão válida com refresh automático
      console.log('[AI Assistant] Verificando sessão...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AI Assistant] Erro ao verificar sessão:', sessionError);
      }
      
      if (!session) {
        console.log('[AI Assistant] Sessão não encontrada, tentando refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[AI Assistant] Falha no refresh:', refreshError);
          toast.error("Sua sessão expirou. Por favor, faça login novamente.", {
            description: "Redirecionando para a página de login..."
          });
          
          setTimeout(() => {
            window.location.href = '/auth';
          }, 2000);
          
          setLoading(false);
          return;
        }
        
        console.log('[AI Assistant] ✅ Sessão renovada com sucesso');
      } else {
        console.log('[AI Assistant] ✅ Sessão válida encontrada');
        
        // ✅ CORREÇÃO 2: Verificar se token não está próximo de expirar
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          // Se expira em menos de 5 minutos, renovar preventivamente
          if (timeUntilExpiry < 300) {
            console.log('[AI Assistant] Token expirando em breve, renovando preventivamente...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.warn('[AI Assistant] Aviso: refresh preventivo falhou:', refreshError);
            } else {
              console.log('[AI Assistant] ✅ Token renovado preventivamente');
            }
          }
        }
      }

      const fullContext = {
        ...context,
        ...(captionContext || {}),
      };

      console.log('[AI Assistant] Chamando generate-caption:', { clientId, contentType, context: fullContext });

      // ✅ CORREÇÃO 3: Adicionar timeout e retry
      let retryCount = 0;
      const maxRetries = 2;
      let lastError: any = null;

      while (retryCount <= maxRetries) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-caption', {
            body: {
              clientId,
              contentType,
              context: fullContext,
            },
          });

          // Se teve sucesso, sair do loop
          if (!error) {
            // Verificar se a resposta contém erro (mesmo com status 200)
            if (data?.error) {
              throw new Error(data.details || data.error);
            }

            if (data?.limitReached) {
              toast.error("Limite de uso de IA atingido para este mês", {
                description: "Considere fazer upgrade do plano para mais usos de IA"
              });
              setLoading(false);
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
            
            setLoading(false);
            return;
          }

          // Se teve erro, verificar se é de autenticação
          if (error && retryCount < maxRetries) {
            const errorMessage = (error as any)?.message || '';
            
            // Se for erro de autenticação, tentar refresh e retry
            if (errorMessage.includes('Authentication') || errorMessage.includes('Auth session') || errorMessage.includes('401')) {
              console.log(`[AI Assistant] Erro de autenticação detectado, tentando refresh (tentativa ${retryCount + 1}/${maxRetries})...`);
              
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error('[AI Assistant] Refresh falhou:', refreshError);
                throw error; // Não tentar mais
              }
              
              console.log('[AI Assistant] ✅ Sessão renovada, tentando novamente...');
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar 500ms
              continue;
            }
          }

          // Se não é erro de autenticação ou acabaram as tentativas, lançar erro
          throw error;

        } catch (err) {
          lastError = err;
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[AI Assistant] Tentativa ${retryCount} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            break;
          }
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      throw lastError;

    } catch (error: any) {
      console.error('[AI Assistant] Erro final:', error);
      
      let errorMessage = 'Erro ao gerar sugestões. Tente novamente.';
      
      // Extrair mensagem de erro mais específica
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      // Verificar erros específicos no contexto
      if (error?.context?.response) {
        try {
          const errorResponse = await error.context.response.json();
          if (errorResponse?.error) {
            errorMessage = errorResponse.details || errorResponse.error;
          }
        } catch (e) {
          console.error('[AI Assistant] Erro ao parsear resposta de erro:', e);
        }
      }
      
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
