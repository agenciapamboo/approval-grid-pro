import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  title?: string;
  date?: string;
  actor?: {
    name: string;
    email?: string;
    phone?: string;
  };
  comment?: string;
  links?: {
    admin?: string;
    preview?: string;
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
    // Buscar dados do conteúdo e cliente/agência
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('*, clients!inner(*)')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('Erro ao buscar conteúdo:', contentError);
      return { success: false, error: contentError };
    }

    // Throttle: evitar duplicações por 1h para eventos específicos
    const throttleEvents = ['content.revised', 'content.rejected', 'content.approved'];
    if (throttleEvents.includes(event)) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('notifications')
        .select('id, created_at, status')
        .eq('event', event)
        .eq('content_id', contentId)
        .gte('created_at', oneHourAgo)
        .in('status', ['pending', 'sent'])
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('Throttle ativo. Ignorando notificação duplicada:', { event, contentId });
        return { success: true, data: { throttled: true } } as any;
      }
    }

    // Dados do ator (usuário atual)
    const { data: userData } = await supabase.auth.getUser();

    // Construir links úteis
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const adminLink = `${origin}/agency/client/${content.client_id}`;
    const previewLink = `${origin}/content/${contentId}`;

    // Payload final padronizado
    const finalPayload: NotificationPayload = {
      ...payload,
      event,
      actor: {
        name: userData?.user?.user_metadata?.name || userData?.user?.email || 'Usuário',
        email: userData?.user?.email || undefined,
        phone: (userData?.user?.user_metadata as any)?.phone || undefined,
      },
      client_id: content.client_id,
      agency_id: (content as any).clients?.agency_id,
      content_id: contentId,
      title: (payload?.title as string) ?? content.title,
      date: (payload?.date as string) ?? content.date,
      channels: content.channels || [],
      links: {
        admin: adminLink,
        preview: previewLink,
      },
    };

    // Chamar a função SQL send_notification
    const { data, error } = await supabase.rpc('send_notification', {
      p_event: event,
      p_content_id: contentId,
      p_client_id: content.client_id,
      p_agency_id: (content as any).clients?.agency_id,
      p_payload: finalPayload as any,
    });

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return { success: false, error };
    }

    console.log('send_notification() disparado', { event, content_id: contentId, notification_id: data });

    // Disparar processamento das notificações via edge function
    const { error: invokeError } = await supabase.functions.invoke('notify-event');

    if (invokeError) {
      console.error('Erro ao disparar processamento de notificações:', invokeError);
    } else {
      console.log('notify-event invocado com sucesso', { event, content_id: contentId });
    }

    // Log opcional em activity_log
    await supabase.from('activity_log').insert({
      entity: 'content',
      entity_id: contentId,
      action: 'notification_sent',
      actor_user_id: userData?.user?.id || null,
      metadata: finalPayload as any,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return { success: false, error };
  }
};
