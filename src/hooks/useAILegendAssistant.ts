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
      console.log('[AI Assistant] 🔍 Verificando sessão...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AI Assistant] ❌ Erro ao verificar sessão:', sessionError);
      }
      
      if (!session) {
        console.log('[AI Assistant] ⚠️ Sessão não encontrada, tentando refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[AI Assistant] ❌ Falha no refresh:', refreshError);
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
        console.log('[AI Assistant] 📊 Novo token expira em:', new Date((refreshData.session.expires_at || 0) * 1000).toLocaleString());
      } else {
        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        const expiresInMinutes = Math.floor(timeUntilExpiry / 60);
        
        console.log('[AI Assistant] ✅ Sessão válida encontrada');
        console.log('[AI Assistant] 📊 Token atual:');
        console.log(`  - User ID: ${session.user?.id}`);
        console.log(`  - Expira em: ${expiresInMinutes} minutos (${new Date(expiresAt * 1000).toLocaleString()})`);
        console.log(`  - Access Token (primeiros 50 chars): ${session.access_token?.substring(0, 50)}...`);
        
        // ✅ CORREÇÃO 2: Verificar se token não está próximo de expirar
        if (expiresAt) {
          // Se expira em menos de 30 minutos, renovar preventivamente (mais agressivo para evitar 401)
          if (timeUntilExpiry < 1800) {
            console.log(`[AI Assistant] ⚠️ Token expirando em ${expiresInMinutes} minutos, renovando preventivamente...`);
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.warn('[AI Assistant] ⚠️ Aviso: refresh preventivo falhou:', refreshError);
            } else if (refreshData.session) {
              console.log('[AI Assistant] ✅ Token renovado preventivamente');
              const newExpiresAt = refreshData.session.expires_at || 0;
              const newExpiresInMinutes = Math.floor((newExpiresAt - now) / 60);
              console.log(`[AI Assistant] 📊 Novo token expira em: ${newExpiresInMinutes} minutos`);
            }
          } else if (timeUntilExpiry < 0) {
            console.error(`[AI Assistant] ❌ Token JÁ EXPIROU há ${Math.abs(expiresInMinutes)} minutos!`);
            console.log('[AI Assistant] 🔄 Forçando refresh do token expirado...');
            
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshData.session) {
              console.error('[AI Assistant] ❌ Não foi possível renovar token expirado:', refreshError);
              toast.error("Sua sessão expirou. Por favor, faça login novamente.");
              setTimeout(() => window.location.href = '/auth', 2000);
              setLoading(false);
              return;
            }
            
            console.log('[AI Assistant] ✅ Token expirado renovado com sucesso');
          }
        }
      }

      // ✅ CORREÇÃO 3: SEMPRE renovar token antes de chamar Edge Function (solução definitiva!)
      console.log('[AI Assistant] 🔄 Renovando token ANTES da chamada (garantir token fresco)...');
      const { data: freshSession, error: freshError } = await supabase.auth.refreshSession();
      
      if (freshError || !freshSession.session) {
        console.error('[AI Assistant] ❌ Falha ao renovar token:', freshError);
        toast.error("Erro ao renovar sessão. Por favor, faça login novamente.");
        setTimeout(() => window.location.href = '/auth', 2000);
        setLoading(false);
        return;
      }
      
      const freshExpiresAt = freshSession.session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const freshExpiresInMinutes = Math.floor((freshExpiresAt - now) / 60);
      console.log('[AI Assistant] ✅ Token renovado! Expira em:', freshExpiresInMinutes, 'minutos');
      console.log('[AI Assistant] 🔑 Novo token (50 chars):', freshSession.session.access_token?.substring(0, 50) + '...');

      const fullContext = {
        ...context,
        ...(captionContext || {}),
      };

      console.log('[AI Assistant] 📤 Preparando chamada para generate-caption');
      console.log('[AI Assistant] 📋 Payload:', { clientId, contentType, context: fullContext });

      // ✅ CORREÇÃO 3: Adicionar timeout e retry
      let retryCount = 0;
      const maxRetries = 2;
      let lastError: any = null;

      while (retryCount <= maxRetries) {
        try {
          console.log(`[AI Assistant] 🚀 Invocando Edge Function (tentativa ${retryCount + 1}/${maxRetries + 1})...`);
          
          const { data, error } = await supabase.functions.invoke('generate-caption', {
            body: {
              clientId,
              contentType,
              context: fullContext,
            },
          });

          console.log('[AI Assistant] 📥 Resposta recebida:', { 
            hasError: !!error, 
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : []
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
            console.error(`[AI Assistant] ❌ Erro na tentativa ${retryCount + 1}:`, errorMessage);
            
            // Se for erro de autenticação, tentar refresh e retry
            if (errorMessage.includes('Authentication') || errorMessage.includes('Auth session') || errorMessage.includes('401') || errorMessage.includes('FunctionsHttpError')) {
              console.log(`[AI Assistant] 🔄 Erro de autenticação detectado, tentando refresh (tentativa ${retryCount + 1}/${maxRetries})...`);
              
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error('[AI Assistant] ❌ Refresh falhou:', refreshError);
                throw error; // Não tentar mais
              }
              
              if (refreshData.session) {
                const newExpiresAt = refreshData.session.expires_at || 0;
                const now = Math.floor(Date.now() / 1000);
                const expiresInMinutes = Math.floor((newExpiresAt - now) / 60);
                console.log('[AI Assistant] ✅ Sessão renovada com sucesso!');
                console.log(`[AI Assistant] 📊 Novo token expira em: ${expiresInMinutes} minutos`);
                console.log(`[AI Assistant] 🔑 Access Token (primeiros 50 chars): ${refreshData.session.access_token?.substring(0, 50)}...`);
              }
              
              retryCount++;
              console.log(`[AI Assistant] ⏳ Aguardando 500ms antes de tentar novamente...`);
              await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar 500ms
              console.log(`[AI Assistant] 🔄 Tentando novamente (tentativa ${retryCount + 1}/${maxRetries + 1})...`);
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
