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
      .select('*, clients!inner(*, agencies!inner(*))')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('Erro ao buscar conteúdo:', contentError);
      return { success: false, error: contentError };
    }

    // Buscar preferências de notificação do cliente
    const { data: clientUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('client_id', content.client_id)
      .limit(1)
      .single();

    // Buscar preferências diretamente da tabela clients
    const clientPreferences = {
      email: (content as any).clients?.notify_email ?? true,
      whatsapp: (content as any).clients?.notify_whatsapp ?? false,
      webhook: true // Webhook SEMPRE ativo
    };

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
    let previewLink = `${origin}/content/${contentId}`;

    // Se o evento é de envio para revisão, gerar token de aprovação
    if (event === 'content.sent_for_review' && content) {
      try {
        const contentDate = new Date(content.date);
        const month = `${contentDate.getFullYear()}-${String(contentDate.getMonth() + 1).padStart(2, '0')}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        const invokeOptions: any = {
          body: {
            client_id: content.client_id,
            month: month
          }
        };
        if (session?.access_token) {
          invokeOptions.headers = { Authorization: `Bearer ${session.access_token}` };
        }
        
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-approval-link', invokeOptions);

        if (!tokenError && tokenData?.approval_url) {
          previewLink = tokenData.approval_url;
          console.log('Generated approval link for notification:', previewLink);
        } else {
          console.error('Error generating approval link:', tokenError);
        }
      } catch (error) {
        console.error('Failed to generate approval link:', error);
      }
    }

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
      // Contatos do cliente para uso no WhatsApp/email
      client_whatsapp: (content as any).clients?.whatsapp,
      client_email: (content as any).clients?.email,
      client_name: (content as any).clients?.name,
      // Preferências de notificação do cliente
      notification_preferences: {
        email: clientPreferences.email,
        whatsapp: clientPreferences.whatsapp,
        webhook: clientPreferences.webhook
      },
      recipient: {
        type: 'client',
        id: content.client_id,
        name: (content as any).clients?.name,
        email: (content as any).clients?.email,
        whatsapp: (content as any).clients?.whatsapp,
      },
      agency: {
        name: (content as any).clients?.agencies?.name,
        email: (content as any).clients?.agencies?.email,
        whatsapp: (content as any).clients?.agencies?.whatsapp,
      },
      links: {
        admin: adminLink,
        preview: previewLink,
      },
    };

    console.log('createNotification payload:', finalPayload);
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
