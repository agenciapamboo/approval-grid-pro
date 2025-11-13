import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔔 Iniciando teste de webhook 2FA...')

    // Buscar URL do webhook
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'two_factor_webhook_url')
      .single()

    if (settingsError || !settings?.value) {
      console.error('❌ Webhook não configurado:', settingsError)
      throw new Error('Webhook de 2FA não configurado em Configurações do Sistema')
    }

    console.log('📡 URL do webhook:', settings.value)

    // Payload de teste
    const testPayload = {
      approver_email: "teste@exemplo.com",
      approver_phone: "+5511999999999",
      client_name: "Cliente Teste",
      code: "123456",
      expires_in: "15 minutos",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0 (Test Webhook)",
      timestamp: new Date().toISOString(),
      test: "true"
    }

    // Fazer requisição para o webhook externo
    const urlParams = new URLSearchParams(testPayload)
    const webhookUrl = `${settings.value}?${urlParams.toString()}`

    console.log('🚀 Enviando requisição para webhook...')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos

    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type')
      let data

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      console.log('✅ Resposta do webhook:', { status: response.status, data })

      return new Response(
        JSON.stringify({ 
          success: true, 
          data,
          payload: testPayload,
          status: response.status,
          message: `Webhook respondeu com status ${response.status}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError?.name === 'AbortError') {
        console.error('⏱️ Timeout ao chamar webhook')
        throw new Error('Timeout: O webhook demorou mais de 15 segundos para responder')
      }
      
      console.error('❌ Erro ao chamar webhook:', fetchError)
      throw new Error(`Erro ao chamar webhook: ${fetchError?.message || 'Erro desconhecido'}`)
    }

  } catch (error: any) {
    console.error('❌ Erro geral:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Erro desconhecido ao testar webhook'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
