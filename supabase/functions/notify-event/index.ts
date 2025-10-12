import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  event: string
  content_id?: string
  client_id?: string
  agency_id?: string
  user_id?: string
  payload?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { event, content_id, client_id, agency_id, user_id, payload } = await req.json() as NotificationPayload

    console.log('Notification event triggered:', { event, content_id, client_id, agency_id })

    // Buscar detalhes do conteúdo se content_id foi fornecido
    let enrichedPayload = payload || {}
    
    if (content_id) {
      const { data: content, error: contentError } = await supabaseClient
        .from('contents')
        .select('*, clients!inner(*)')
        .eq('id', content_id)
        .single()

      if (!contentError && content) {
        enrichedPayload = {
          ...enrichedPayload,
          content: {
            id: content.id,
            title: content.title,
            date: content.date,
            status: content.status,
            type: content.type,
            category: content.category,
            channels: content.channels,
          },
          client: {
            id: content.clients.id,
            name: content.clients.name,
            slug: content.clients.slug,
          },
        }

        // Buscar informações da agência
        const { data: agency } = await supabaseClient
          .from('agencies')
          .select('id, name, slug, webhook_url')
          .eq('id', content.clients.agency_id)
          .single()
        
        if (agency) {
          enrichedPayload.agency = {
            id: agency.id,
            name: agency.name,
            slug: agency.slug,
          }
        }
      }
    }

    // Chamar a função send_notification do banco
    const { data: notificationId, error: notificationError } = await supabaseClient
      .rpc('send_notification', {
        p_event: event,
        p_content_id: content_id || null,
        p_client_id: client_id || null,
        p_agency_id: agency_id || null,
        p_user_id: user_id || null,
        p_payload: enrichedPayload,
      })

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      throw notificationError
    }

    console.log('Notification created:', notificationId)

    // Buscar notificações pendentes para processar
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      throw fetchError
    }

    // Processar cada notificação
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
    const n8nWebhookToken = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!n8nWebhookUrl) {
      console.log('N8N_WEBHOOK_URL not configured, skipping webhook delivery')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notifications created but webhook not configured',
          notification_id: notificationId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = []
    for (const notification of pendingNotifications || []) {
      try {
        const webhookPayload = {
          notification_id: notification.id,
          event: notification.event,
          channel: notification.channel,
          ...notification.payload,
        }

        console.log('Sending to n8n:', n8nWebhookUrl, 'Event:', notification.event, 'Channel:', notification.channel)

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': n8nWebhookToken ? `Bearer ${n8nWebhookToken}` : '',
          },
          body: JSON.stringify(webhookPayload),
        })

        console.log('Webhook response status:', webhookResponse.status)

        // Atualizar status da notificação
        await supabaseClient
          .from('notifications')
          .update({
            status: webhookResponse.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`,
          })
          .eq('id', notification.id)

        results.push({
          notification_id: notification.id,
          status: webhookResponse.ok ? 'sent' : 'failed',
          http_status: webhookResponse.status,
        })
      } catch (webhookError) {
        console.error('Error sending notification:', webhookError)
        
        await supabaseClient
          .from('notifications')
          .update({
            status: 'failed',
            error_message: webhookError instanceof Error ? webhookError.message : String(webhookError),
            retry_count: notification.retry_count + 1,
          })
          .eq('id', notification.id)

        results.push({
          notification_id: notification.id,
          status: 'failed',
          error: webhookError instanceof Error ? webhookError.message : String(webhookError),
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications processed',
        notification_id: notificationId,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in notify-event function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
