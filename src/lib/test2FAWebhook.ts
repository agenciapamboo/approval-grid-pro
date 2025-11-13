import { supabase } from "@/integrations/supabase/client";

export const sendTest2FACode = async () => {
  try {
    console.log('🔔 Iniciando teste de webhook 2FA via edge function...');

    // Chamar edge function em vez de fazer fetch direto
    const { data, error } = await supabase.functions.invoke('test-2fa-webhook', {
      body: {}
    });

    if (error) {
      console.error('❌ Erro ao chamar edge function:', error);
      return { 
        success: false, 
        error: error.message || "Erro ao enviar teste de webhook 2FA"
      };
    }

    if (!data?.success) {
      console.error('❌ Edge function retornou erro:', data?.error);
      return {
        success: false,
        error: data?.error || "Erro desconhecido ao testar webhook"
      };
    }

    console.log('✅ Webhook testado com sucesso:', data);
    return { 
      success: true, 
      data: data.data,
      payload: data.payload,
      status: data.status,
      message: data.message
    };

  } catch (error) {
    console.error('❌ Erro ao enviar código 2FA de teste:', error);
    
    // Mensagens de erro mais específicas
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      return {
        success: false,
        error: "Erro de rede: Verifique sua conexão com a internet"
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido ao testar webhook"
    };
  }
};
