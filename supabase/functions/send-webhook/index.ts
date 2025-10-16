import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

interface WebhookPayload {
  event: string
  content_id: string
  client_id?: string
  agency_id?: string
  content?: any
  client?: any
  agency?: any
  creative_request?: any
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

    const { event, content_id, client_id, agency_id } = await req.json()

    console.log('Webhook triggered:', { event, content_id, client_id, agency_id })

    let webhookUrl: string | null = null
    let targetId: string
    let targetType: 'client' | 'agency'
    let payload: WebhookPayload

    // Para eventos relacionados a jobs (novojob e job.*)
    if (event === 'novojob' || event.startsWith('job.')) {
      const { data: notification, error: notificationError } = await supabaseClient
        .from('notifications')
        .select('*, clients!inner(*, agencies!inner(*)), agencies!inner(*)')
        .eq('id', content_id)
        .single()

      if (notificationError) {
        console.error('Error fetching notification:', notificationError)
        throw notificationError
      }

      // Buscar webhook_url da agência (não do notification.agencies que pode estar null)
      const { data: agency } = await supabaseClient
        .from('agencies')
        .select('webhook_url, id, name, slug, email, whatsapp')
        .eq('id', notification.agency_id)
        .single()

      webhookUrl = agency?.webhook_url || null
      targetId = notification.agency_id
      targetType = 'agency'

      console.log('Job webhook URL from agency:', { 
        agency_id: notification.agency_id, 
        webhook_url: webhookUrl,
        event 
      })

      payload = {
        event,
        content_id,
        client_id: notification.client_id,
        agency_id: notification.agency_id,
        creative_request: {
          ...notification.payload,
          created_at: notification.created_at,
        },
        client: {
          id: notification.clients.id,
          name: notification.clients.name,
          slug: notification.clients.slug,
          email: notification.clients.email,
          whatsapp: notification.clients.whatsapp,
        },
        agency: {
          id: agency?.id,
          name: agency?.name,
          slug: agency?.slug,
          email: agency?.email,
          whatsapp: agency?.whatsapp,
        }
      }
    } else {
      // Para outros eventos, buscar da tabela contents
      const { data: content, error: contentError } = await supabaseClient
        .from('contents')
        .select('*, clients!inner(*)')
        .eq('id', content_id)
        .single()

      if (contentError) {
        console.error('Error fetching content:', contentError)
        throw contentError
      }

      // Sempre buscar o webhook da agência para todos os eventos
      const { data: agency } = await supabaseClient
        .from('agencies')
        .select('webhook_url, id, name, slug, email, whatsapp')
        .eq('id', content.clients.agency_id)
        .single()
      
      webhookUrl = agency?.webhook_url || null
      targetId = content.clients.agency_id
      targetType = 'agency'

      console.log('Content webhook URL from agency:', { 
        agency_id: content.clients.agency_id, 
        webhook_url: webhookUrl,
        event 
      })

      payload = {
        event,
        content_id,
        content: {
          id: content.id,
          title: content.title,
          date: content.date,
          status: content.status,
          type: content.type,
          category: content.category,
        },
        client: {
          id: content.clients.id,
          name: content.clients.name,
          slug: content.clients.slug,
        },
        agency: {
          id: agency?.id,
          name: agency?.name,
          slug: agency?.slug,
        }
      }
    }

    // Sanitizar payload (remover campos sensíveis)
    const sanitizedPayload = JSON.parse(JSON.stringify(payload))
    
    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log('No webhook URL configured for agency:', { 
        targetId, 
        targetType, 
        event,
        webhook_url: webhookUrl 
      })
      
      // Ainda registrar evento mas como não enviado
      await supabaseClient
        .from('webhook_events')
        .insert({
          client_id: client_id || payload.client?.id,
          event,
          payload: sanitizedPayload,
          status: 'failed',
        })

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No webhook URL configured for agency',
          details: { agency_id: targetId, event }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Validar se a URL é válida
    try {
      new URL(webhookUrl)
    } catch (urlError) {
      console.error('Invalid webhook URL:', { webhookUrl, urlError })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid webhook URL configured',
          details: { webhook_url: webhookUrl }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    // Registrar evento de webhook
    const { data: webhookEvent, error: eventError } = await supabaseClient
      .from('webhook_events')
      .insert({
        client_id: client_id || payload.client?.id,
        event,
        payload: sanitizedPayload,
        status: 'queued',
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating webhook event:', eventError)
    }

    console.log('Sending webhook to:', { 
      url: webhookUrl, 
      event, 
      client_id: client_id || payload.client?.id 
    })
    
    // Executar o envio do webhook em background
    const sendWebhookTask = async () => {
      try {
        // Construir URL com query parameters para GET request
        const urlWithParams = new URL(webhookUrl)
        urlWithParams.searchParams.set('event', event)
        urlWithParams.searchParams.set('content_id', content_id)
        if (sanitizedPayload.client_id) {
          urlWithParams.searchParams.set('client_id', sanitizedPayload.client_id)
        }
        if (sanitizedPayload.agency_id) {
          urlWithParams.searchParams.set('agency_id', sanitizedPayload.agency_id)
        }
        // Adicionar payload como JSON string
        urlWithParams.searchParams.set('data', JSON.stringify(sanitizedPayload))

        const webhookResponse = await fetch(urlWithParams.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })

        const responseText = await webhookResponse.text()
        console.log('Webhook response:', { 
          status: webhookResponse.status, 
          ok: webhookResponse.ok,
          statusText: webhookResponse.statusText,
          body: responseText.substring(0, 200)
        })

        // Atualizar status do webhook event
        if (webhookEvent) {
          await supabaseClient
            .from('webhook_events')
            .update({
              status: webhookResponse.ok ? 'delivered' : 'failed',
              delivered_at: new Date().toISOString(),
            })
            .eq('id', webhookEvent.id)
        }

        // Atualizar status da notificação
        await supabaseClient
          .from('notifications')
          .update({
            status: webhookResponse.ok ? 'sent' : 'failed',
            sent_at: webhookResponse.ok ? new Date().toISOString() : null,
            error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}: ${responseText.substring(0, 200)}`,
          })
          .eq('id', content_id)

      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError)
        
        // Atualizar status para failed
        if (webhookEvent) {
          await supabaseClient
            .from('webhook_events')
            .update({
              status: 'failed',
            })
            .eq('id', webhookEvent.id)
        }

        await supabaseClient
          .from('notifications')
          .update({
            status: 'failed',
            error_message: webhookError instanceof Error ? webhookError.message : String(webhookError),
          })
          .eq('id', content_id)
      }
    }

    // Executar em background sem bloquear a resposta
    EdgeRuntime.waitUntil(sendWebhookTask())

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook queued for delivery',
        webhook_event_id: webhookEvent?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in webhook function:', error)
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
