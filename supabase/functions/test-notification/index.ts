import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
    const N8N_WEBHOOK_TOKEN = Deno.env.get('N8N_WEBHOOK_TOKEN')

    if (!N8N_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ success: false, error: 'N8N_WEBHOOK_URL not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Payload de teste com todos os campos possíveis
    const testPayload = {
      notification_id: '00000000-0000-0000-0000-000000000000',
      event: 'content.approved',
      channel: 'email',
      content_id: '11111111-1111-1111-1111-111111111111',
      client_id: '22222222-2222-2222-2222-222222222222',
      agency_id: '33333333-3333-3333-3333-333333333333',
      user_id: '44444444-4444-4444-4444-444444444444',
      payload: {
        title: 'Conteúdo de Teste',
        date: '2025-10-12',
        actor: {
          name: 'João Silva',
          email: 'joao@example.com'
        },
        comment: 'Este é um comentário de teste',
        links: {
          admin: 'https://app.example.com/admin/content/11111111-1111-1111-1111-111111111111'
        },
        channels: ['instagram', 'facebook'],
        client_name: 'Cliente Exemplo',
        agency_name: 'Agência Exemplo'
      },
      created_at: new Date().toISOString(),
    }

    console.log('Sending test notification to n8n:', testPayload)

    // Enviar via GET simples sem headers de autenticação
    const params = new URLSearchParams({
      notification_id: testPayload.notification_id,
      event: testPayload.event,
      channel: testPayload.channel,
      content_id: testPayload.content_id,
      client_id: testPayload.client_id,
      agency_id: testPayload.agency_id,
      user_id: testPayload.user_id,
      payload: JSON.stringify(testPayload.payload),
      created_at: testPayload.created_at,
    })

    const n8nResponse = await fetch(`${N8N_WEBHOOK_URL}?${params.toString()}`, {
      method: 'GET',
    })

    const responseText = await n8nResponse.text()
    console.log('n8n response:', n8nResponse.status, responseText)

    if (n8nResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test notification sent successfully',
          payload: testPayload,
          n8n_response: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `n8n returned ${n8nResponse.status}: ${responseText}`,
          payload: testPayload
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in test-notification function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
