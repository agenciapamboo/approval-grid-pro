import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  content_id: string;
  content_title: string;
  client_id: string;
  client_name: string;
  date: string;
  deadline?: string;
  status: string;
  type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { event, content_id, client_id } = await req.json() as {
      event: string;
      content_id: string;
      client_id: string;
    };

    console.log(`Processing webhook for event: ${event}, content: ${content_id}`);

    // Buscar informações do cliente
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, name, webhook_url')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Cliente não encontrado');
    }

    if (!client.webhook_url) {
      console.log('Cliente não possui webhook configurado');
      return new Response(
        JSON.stringify({ message: 'Webhook não configurado para este cliente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar informações do conteúdo
    const { data: content, error: contentError } = await supabaseClient
      .from('contents')
      .select('*')
      .eq('id', content_id)
      .single();

    if (contentError || !content) {
      throw new Error('Conteúdo não encontrado');
    }

    // Criar payload do webhook (sanitized - remove sensitive fields)
    const payload: WebhookPayload = {
      event,
      content_id: content.id,
      content_title: content.title,
      client_id: client.id,
      client_name: client.name,
      date: content.date,
      deadline: content.deadline,
      status: content.status,
      type: content.type,
    };

    // Sanitize payload before storage - remove any sensitive keys
    const sanitizePayload = (obj: any): any => {
      const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'private_key', 'auth'];
      const sanitized = { ...obj };
      
      for (const key of sensitiveKeys) {
        delete sanitized[key];
      }
      
      // Recursively sanitize nested objects
      for (const key in sanitized) {
        if (sanitized[key] && typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizePayload(sanitized[key]);
        }
      }
      
      return sanitized;
    };

    // Registrar evento de webhook com payload sanitizado
    const { error: webhookEventError } = await supabaseClient
      .from('webhook_events')
      .insert({
        client_id: client.id,
        event,
        payload: sanitizePayload(payload),
        status: 'queued',
      });

    if (webhookEventError) {
      console.error('Erro ao registrar evento de webhook:', webhookEventError);
    }

    // Enviar webhook
    try {
      const webhookResponse = await fetch(client.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Social-Approval-Webhook/1.0',
        },
        body: JSON.stringify(payload),
      });

      const delivered = webhookResponse.ok;

      // Atualizar status do evento
      await supabaseClient
        .from('webhook_events')
        .update({
          status: delivered ? 'delivered' : 'failed',
          delivered_at: delivered ? new Date().toISOString() : null,
        })
        .eq('client_id', client.id)
        .eq('event', event)
        .eq('payload->content_id', content_id);

      console.log(`Webhook ${delivered ? 'enviado com sucesso' : 'falhou'} para ${client.webhook_url}`);

      return new Response(
        JSON.stringify({ 
          success: delivered, 
          message: delivered ? 'Webhook enviado com sucesso' : 'Falha ao enviar webhook'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: delivered ? 200 : 500 
        }
      );
    } catch (webhookError) {
      console.error('Erro ao enviar webhook:', webhookError);
      
      await supabaseClient
        .from('webhook_events')
        .update({ status: 'failed' })
        .eq('client_id', client.id)
        .eq('event', event)
        .eq('payload->content_id', content_id);

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao enviar webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
