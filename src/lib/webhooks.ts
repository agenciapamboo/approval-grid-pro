import { supabase } from "@/integrations/supabase/client";

export const triggerWebhook = async (
  event: string,
  contentId: string,
  clientId: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: {
        event,
        content_id: contentId,
        client_id: clientId,
      },
    });

    if (error) {
      console.error('Erro ao disparar webhook:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao disparar webhook:', error);
    return { success: false, error };
  }
};
