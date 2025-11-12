import { supabase } from "@/integrations/supabase/client";

export const sendTest2FACode = async () => {
  try {
    // Buscar URL do webhook de 2FA
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "two_factor_webhook_url")
      .single();

    const webhookUrl = settingsData?.value;
    
    if (!webhookUrl) {
      return { 
        success: false, 
        error: "Webhook de 2FA não configurado em Configurações do Sistema" 
      };
    }

    // Payload de teste simulando envio de código 2FA
    const testPayload = {
      approver_email: "teste@exemplo.com",
      approver_phone: "+5511999999999",
      client_name: "Cliente Teste",
      code: "123456",
      expires_in: "15 minutos",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0 (Test Webhook)",
      timestamp: new Date().toISOString(),
      test: true
    };

    // Enviar requisição GET com parâmetros na URL
    const urlParams = new URLSearchParams(testPayload as any);
    const fullUrl = `${webhookUrl}?${urlParams.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return { success: true, data, payload: testPayload };
  } catch (error) {
    console.error('Erro ao enviar código 2FA de teste:', error);
    return { success: false, error };
  }
};
