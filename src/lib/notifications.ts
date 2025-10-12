import { supabase } from "@/integrations/supabase/client";

export const triggerNotification = async (
  event: string,
  contentId?: string,
  clientId?: string,
  agencyId?: string,
  userId?: string,
  payload?: any
) => {
  try {
    const { data, error } = await supabase.functions.invoke('notify-event', {
      body: {
        event,
        content_id: contentId,
        client_id: clientId,
        agency_id: agencyId,
        user_id: userId,
        payload,
      },
    });

    if (error) {
      console.error('Erro ao disparar notificação:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao disparar notificação:', error);
    return { success: false, error };
  }
};
