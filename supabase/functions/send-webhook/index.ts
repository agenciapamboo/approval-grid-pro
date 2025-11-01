import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

// Validation schema
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidEvent = (str: string): boolean => {
  return typeof str === 'string' && str.length > 0 && str.length <= 100;
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
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { event, content_id, client_id, agency_id } = requestBody;

    // Input validation
    if (!isValidEvent(event)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUUID(content_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid content_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (client_id && !isValidUUID(client_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid client_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (agency_id && !isValidUUID(agency_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid agency_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook triggered:', { event, content_id, client_id, agency_id })

    // Use service role key for internal operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let webhookUrl: string | null = null
    let targetId: string
    let targetType: 'client' | 'agency'
    let payload: WebhookPayload

    // Para eventos relacionados a jobs (novojob e job.*)
    if (event === 'novojob' || event.startsWith('job.')) {
      const { data: notification, error: notificationError } = await supabaseAdmin
        .from('notifications')
        .select('*, clients!inner(*, agencies!inner(*)), agencies!inner(*)')
        .eq('id', content_id)
        .single()

      if (notificationError) {
        console.error('Error fetching notification:', notificationError)
        return new Response(
          JSON.stringify({ error: 'Notification not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar webhook_url da agência (não do notification.agencies que pode estar null)
      const { data: agency } = await supabaseAdmin
        .from('agencies_secure')
        .select('webhook_url, id, name, slug, email, whatsapp')
        .eq('id', notification.agency_id)
        .single()

      webhookUrl = agency?.webhook_url || null
      targetId = notification.agency_id
      targetType = 'agency'

      console.log('Job webhook URL from agency:', { 
        agency_id: notification.agency_id, 
        webhook_url: webhookUrl ? '[REDACTED]' : null,
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
        },
        agency: {
          id: agency?.id,
          name: agency?.name,
          slug: agency?.slug,
        }
      }
    } else {
      // Para outros eventos, buscar da tabela contents
      const { data: content, error: contentError } = await supabaseAdmin
        .from('contents')
        .select(`
          *,
          clients!inner(
            *,
            agencies!inner(*)
          )
        `)
        .eq('id', content_id)
        .single()

      if (contentError) {
        console.error('Error fetching content:', contentError)
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const client = content.clients
      const agency = client.agencies

      // Usar webhook_url da agência (via agencies_secure)
      const { data: agencySecure } = await supabaseAdmin
        .from('agencies_secure')
        .select('webhook_url')
        .eq('id', agency.id)
        .single()

      webhookUrl = agencySecure?.webhook_url || null
      targetId = agency.id
      targetType = 'agency'

      console.log('Content webhook URL from agency:', { 
        agency_id: agency.id, 
        webhook_url: webhookUrl ? '[REDACTED]' : null,
        event 
      })

      payload = {
        event,
        content_id,
        client_id: client.id,
        agency_id: agency.id,
        content: {
          id: content.id,
          title: content.title,
          type: content.type,
          status: content.status,
          date: content.date,
          deadline: content.deadline,
        },
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug,
        },
        agency: {
          id: agency.id,
          name: agency.name,
          slug: agency.slug,
        }
      }
    }

    if (!webhookUrl) {
      console.log('No webhook URL configured for target:', { targetType, targetId })
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No webhook URL configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Log webhook event
    const { data: webhookEvent, error: webhookEventError } = await supabaseAdmin
      .from('webhook_events')
      .insert({
        client_id: payload.client_id || null,
        event: payload.event,
        payload: payload,
        status: 'queued'
      })
      .select()
      .single()

    if (webhookEventError) {
      console.error('Error logging webhook event:', webhookEventError)
    }

    // Send webhook asynchronously
    const sendWebhookTask = async () => {
      try {
        const params = new URLSearchParams({
          event: payload.event,
          content_id: payload.content_id,
          ...(payload.client_id && { client_id: payload.client_id }),
          ...(payload.agency_id && { agency_id: payload.agency_id }),
          payload: JSON.stringify(payload)
        })

        const response = await fetch(`${webhookUrl}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (webhookEvent) {
          if (response.ok) {
            await supabaseAdmin
              .from('webhook_events')
              .update({
                status: 'delivered',
                delivered_at: new Date().toISOString()
              })
              .eq('id', webhookEvent.id)

            await supabaseAdmin
              .from('notifications')
              .update({ status: 'sent' })
              .eq('id', content_id)
          } else {
            await supabaseAdmin
              .from('webhook_events')
              .update({ status: 'failed' })
              .eq('id', webhookEvent.id)

            await supabaseAdmin
              .from('notifications')
              .update({ status: 'failed', error_message: 'Webhook delivery failed' })
              .eq('id', content_id)
          }
        }
      } catch (error) {
        console.error('Error sending webhook:', error)
        if (webhookEvent) {
          await supabaseAdmin
            .from('webhook_events')
            .update({ status: 'failed' })
            .eq('id', webhookEvent.id)
        }
      }
    }

    // Use EdgeRuntime.waitUntil if available (production), otherwise await (development)
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendWebhookTask())
    } else {
      await sendWebhookTask()
    }

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
    console.error('Error in send-webhook function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
