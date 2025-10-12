import { supabase } from "@/integrations/supabase/client";

export const sendTestNotification = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('test-notification');

    if (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      return { success: false, error };
    }

    console.log('Notificação de teste enviada:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    return { success: false, error };
  }
};
