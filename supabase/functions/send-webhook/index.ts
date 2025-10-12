import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  event: string
  content_id: string
  client_id?: string
  agency_id?: string
  content?: any
  client?: any
  agency?: any
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

    // Buscar content details
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
      .select('webhook_url')
      .eq('id', content.clients.agency_id)
      .single()
    
    webhookUrl = agency?.webhook_url
    targetId = content.clients.agency_id
    targetType = 'agency'

    if (!webhookUrl) {
      console.log('No webhook URL configured for agency:', targetId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No webhook URL configured for agency' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Construir payload
    const payload: WebhookPayload = {
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
    }

    // Sempre adicionar informações da agência
    const { data: agencyData } = await supabaseClient
      .from('agencies')
      .select('id, name, slug')
      .eq('id', content.clients.agency_id)
      .single()
    
    payload.agency = agencyData

    // Sanitizar payload (remover campos sensíveis)
    const sanitizedPayload = JSON.parse(JSON.stringify(payload))
    
    // Registrar evento de webhook
    const { data: webhookEvent, error: eventError } = await supabaseClient
      .from('webhook_events')
      .insert({
        client_id: content.client_id,
        event,
        payload: sanitizedPayload,
        status: 'queued',
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating webhook event:', eventError)
    }

    console.log('Sending webhook to:', webhookUrl)
    
    // Enviar webhook
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
      })

      console.log('Webhook response status:', webhookResponse.status)

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

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook sent successfully',
          status: webhookResponse.status 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
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

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to send webhook',
          error: webhookError instanceof Error ? webhookError.message : String(webhookError)
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

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
