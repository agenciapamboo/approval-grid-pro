import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
    const N8N_WEBHOOK_TOKEN = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_WEBHOOK_URL not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'N8N webhook not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Buscar notificações pendentes (deduplicação de 1 hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('notifications')
      .select(`
        *,
        agencies!inner(whatsapp, email),
        clients!inner(whatsapp, email)
      `)
      .eq('status', 'pending')
      .filter('created_at', 'gt', oneHourAgo)
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      throw fetchError
    }

    const results = []

    for (const notification of pendingNotifications || []) {
      try {
        // Preparar payload para o n8n com telefone
        const n8nPayload = {
          notification_id: notification.id,
          event: notification.event,
          channel: notification.channel,
          content_id: notification.content_id,
          client_id: notification.client_id,
          agency_id: notification.agency_id,
          user_id: notification.user_id,
          payload: notification.payload,
          created_at: notification.created_at,
          agency_whatsapp: notification.agencies?.whatsapp,
          agency_email: notification.agencies?.email,
          client_whatsapp: notification.clients?.whatsapp,
          client_email: notification.clients?.email,
        }

        console.log('Sending to n8n:', { event: notification.event, channel: notification.channel })

        // Enviar para o n8n
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${N8N_WEBHOOK_TOKEN}`,
          },
          body: JSON.stringify(n8nPayload),
        })

        console.log('n8n response status:', n8nResponse.status)

        // Atualizar status da notificação
        if (n8nResponse.ok) {
          await supabaseClient
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id)

          results.push({ id: notification.id, status: 'sent' })
        } else {
          const errorText = await n8nResponse.text()
          await supabaseClient
            .from('notifications')
            .update({
              status: 'failed',
              error_message: `n8n returned ${n8nResponse.status}: ${errorText}`,
              retry_count: notification.retry_count + 1,
            })
            .eq('id', notification.id)

          results.push({ id: notification.id, status: 'failed', error: errorText })
        }
      } catch (notificationError) {
        console.error('Error processing notification:', notificationError)
        
        await supabaseClient
          .from('notifications')
          .update({
            status: 'failed',
            error_message: notificationError instanceof Error ? notificationError.message : String(notificationError),
            retry_count: notification.retry_count + 1,
          })
          .eq('id', notification.id)

        results.push({ 
          id: notification.id, 
          status: 'failed', 
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in notify-event function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
