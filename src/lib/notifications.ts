import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  title?: string;
  date?: string;
  actor?: {
    name: string;
    email?: string;
  };
  comment?: string;
  links?: {
    admin?: string;
  };
  channels?: string[];
  [key: string]: any;
}

export const createNotification = async (
  event: string,
  contentId: string,
  payload: NotificationPayload
) => {
  try {
    // Buscar dados do conteúdo
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('*, clients!inner(*)')
      .eq('id', contentId)
      .single();

    if (contentError) {
      console.error('Erro ao buscar conteúdo:', contentError);
      return { success: false, error: contentError };
    }

    // Chamar a função SQL send_notification
    const { data, error } = await supabase.rpc('send_notification', {
      p_event: event,
      p_content_id: contentId,
      p_client_id: content.client_id,
      p_agency_id: content.clients.agency_id,
      p_payload: payload as any,
    });

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return { success: false, error };
    }

    // Disparar processamento das notificações
    const { error: invokeError } = await supabase.functions.invoke('notify-event');

    if (invokeError) {
      console.error('Erro ao disparar processamento de notificações:', invokeError);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return { success: false, error };
  }
};
