import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Flatten nested objects for GET query params
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}[${key}]` : key;
    
    if (value === null || value === undefined) {
      continue;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = String(value);
    }
  }
  
  return flattened;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const requestBody = await req.json();

    // Processar fila de webhooks
    if (requestBody.process_queue) {
      const { data: queuedEvents } = await supabaseAdmin
        .from('webhook_events')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(20);

      if (!queuedEvents || queuedEvents.length === 0) {
        return new Response(
          JSON.stringify({ success: true, processed: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Buscar ambos os webhooks
      const { data: agencyWebhook } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'agency_notifications_webhook_url')
        .single();

      const { data: clientWebhook } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'client_notifications_webhook_url')
        .single();

      let processed = 0;
      for (const event of queuedEvents) {
        try {
          // Determinar qual webhook usar
          const webhookType = event.webhook_type || 'agency';
          const webhookUrl = webhookType === 'client' 
            ? clientWebhook?.value 
            : agencyWebhook?.value;

          if (!webhookUrl) {
            console.error(`Webhook ${webhookType} não configurado`);
            continue;
          }

          const httpMethod = event.http_method || 'POST';
          let response;

          if (httpMethod === 'GET') {
            // Converter payload para query params
            const flattened = flattenObject(event.payload);
            const params = new URLSearchParams(flattened);
            const url = `${webhookUrl}?${params.toString()}`;
            
            response = await fetch(url, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            // POST tradicional
            response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event.payload)
            });
          }

          await supabaseAdmin
            .from('webhook_events')
            .update({
              status: response.ok ? 'delivered' : 'failed',
              delivered_at: response.ok ? new Date().toISOString() : null
            })
            .eq('id', event.id);
          
          if (response.ok) processed++;
        } catch (error) {
          await supabaseAdmin
            .from('webhook_events')
            .update({ status: 'failed' })
            .eq('id', event.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhooks são disparados automaticamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
