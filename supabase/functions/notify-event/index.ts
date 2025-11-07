import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCORS, errorResponse, successResponse, corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsCheck = handleCORS(req);
  if (corsCheck) return corsCheck;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
    const N8N_WEBHOOK_TOKEN = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_WEBHOOK_URL not configured')
      return errorResponse('N8N webhook not configured', 500);
    }

    // Buscar notificações pendentes (deduplicação de 1 hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('notifications')
      .select(`
        *,
        agencies!inner(name, whatsapp, email),
        clients!inner(name, whatsapp, email)
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
          agency: {
            name: notification.agencies?.name,
            email: notification.agencies?.email,
            whatsapp: notification.agencies?.whatsapp,
          },
          client: {
            name: notification.clients?.name,
            email: notification.clients?.email,
            whatsapp: notification.clients?.whatsapp,
          },
        }

        console.log('Sending to n8n (attempt POST):', { event: notification.event, channel: notification.channel })

        // Attempt 1: POST JSON (with optional bearer token)
        let n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(N8N_WEBHOOK_TOKEN ? { 'Authorization': `Bearer ${N8N_WEBHOOK_TOKEN}` } : {}),
          },
          body: JSON.stringify(n8nPayload),
        })

        console.log('n8n POST response status:', n8nResponse.status)

        // Fallback: if POST fails (e.g., 404/405), try GET with query params (compatible with working test webhook)
        if (!n8nResponse.ok) {
          try {
            const params = new URLSearchParams({
              notification_id: String(notification.id),
              event: String(notification.event),
              channel: String(notification.channel ?? ''),
              content_id: String(notification.content_id ?? ''),
              client_id: String(notification.client_id ?? ''),
              agency_id: String(notification.agency_id ?? ''),
              user_id: String(notification.user_id ?? ''),
              payload: JSON.stringify(notification.payload ?? {}),
              created_at: String(notification.created_at ?? ''),
            })

            console.log('Sending to n8n (fallback GET):', `${N8N_WEBHOOK_URL}?${params.toString()}`)
            const getResponse = await fetch(`${N8N_WEBHOOK_URL}?${params.toString()}`, {
              method: 'GET',
            })
            console.log('n8n GET response status:', getResponse.status)
            n8nResponse = getResponse
          } catch (fallbackErr) {
            console.error('Error on n8n GET fallback:', fallbackErr)
          }
        }

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
          const errorText = await n8nResponse.text().catch(() => '')
          // Log detailed error server-side, sanitize for database
          console.error(`Webhook failed for notification ${notification.id}:`, errorText)
          await supabaseClient
            .from('notifications')
            .update({
              status: 'failed',
              error_message: `Webhook delivery failed with status ${n8nResponse.status}`,
              retry_count: notification.retry_count + 1,
            })
            .eq('id', notification.id)

          results.push({ id: notification.id, status: 'failed', error: 'Webhook delivery failed' })
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
    // Return generic error message to client, log details server-side
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process notifications'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
