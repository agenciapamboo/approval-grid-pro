import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  identifier: string; // email ou whatsapp
}

interface ApproverInfo {
  approver_id: string;
  client_id: string;
  approver_name: string;
  identifier_type: 'email' | 'whatsapp';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { identifier }: RequestBody = await req.json();

    if (!identifier || identifier.trim().length === 0) {
      console.error('[send-2fa-code] Missing identifier');
      return new Response(
        JSON.stringify({ error: 'Identificador (email ou WhatsApp) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-2fa-code] Looking for approver with identifier: ${identifier.substring(0, 3)}***`);

    // Validar formato do identificador
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const whatsappRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

    const trimmedIdentifier = identifier.trim();
    const isEmail = emailRegex.test(trimmedIdentifier);
    const isWhatsApp = whatsappRegex.test(trimmedIdentifier);

    if (!isEmail && !isWhatsApp) {
      console.error('[send-2fa-code] Invalid identifier format');
      return new Response(
        JSON.stringify({ 
          error: 'Formato inválido. Use um email válido ou WhatsApp no formato (XX) XXXXX-XXXX' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar aprovador usando a função do banco
    const { data: approverData, error: approverError } = await supabase.rpc(
      'find_approver_by_identifier',
      { p_identifier: identifier.trim() }
    );

    if (approverError) {
      console.error('[send-2fa-code] Error finding approver:', approverError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar aprovador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!approverData || !approverData.approver_id) {
      console.warn('[send-2fa-code] Approver not found for identifier');
      return new Response(
        JSON.stringify({ 
          error: 'Email ou WhatsApp não encontrado. Verifique se está cadastrado como aprovador.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const approver: ApproverInfo = {
      approver_id: approverData.approver_id,
      client_id: approverData.client_id,
      approver_name: approverData.approver_name,
      identifier_type: approverData.identifier_type,
    };

    console.log(`[send-2fa-code] Approver found: ${approver.approver_name} (${approver.identifier_type})`);

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Obter IP e User-Agent
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Salvar código no banco
    const { error: insertError } = await supabase
      .from('two_factor_codes')
      .insert({
        approver_id: approver.approver_id,
        client_id: approver.client_id,
        code,
        identifier: identifier.trim(),
        identifier_type: approver.identifier_type,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error('[send-2fa-code] Error inserting code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código de verificação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-2fa-code] Code generated and saved for approver ${approver.approver_id}`);

    // Buscar webhook URL
    const { data: webhookData, error: webhookError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'two_factor_webhook_url')
      .single();

    if (webhookError || !webhookData?.value) {
      console.error('[send-2fa-code] Webhook URL not configured:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Webhook não configurado. Contate o suporte.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = webhookData.value;

    // Buscar dados do cliente
    const { data: clientData } = await supabase
      .from('clients')
      .select('name, slug')
      .eq('id', approver.client_id)
      .single();

    // Enviar para N8N
    const webhookPayload = {
      event: '2fa.code_sent',
      approver_id: approver.approver_id,
      approver_name: approver.approver_name,
      client_id: approver.client_id,
      client_name: clientData?.name || 'Cliente',
      client_slug: clientData?.slug || '',
      code,
      identifier,
      identifier_type: approver.identifier_type,
      expires_at: expiresAt.toISOString(),
      login_url: `https://aprovacriativos.com.br/aprovar`,
    };

    console.log(`[send-2fa-code] Sending to N8N webhook: ${webhookUrl}`);

    try {
      // Usar GET com query params ao invés de POST
      const queryParams = new URLSearchParams({
        event: webhookPayload.event,
        approver_id: webhookPayload.approver_id,
        approver_name: webhookPayload.approver_name,
        client_id: webhookPayload.client_id,
        client_name: webhookPayload.client_name,
        client_slug: webhookPayload.client_slug,
        code: webhookPayload.code,
        identifier: webhookPayload.identifier,
        identifier_type: webhookPayload.identifier_type,
        expires_at: webhookPayload.expires_at,
        login_url: webhookPayload.login_url,
      });

      const webhookUrlWithParams = `${webhookUrl}?${queryParams.toString()}`;

      const webhookResponse = await fetch(webhookUrlWithParams, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!webhookResponse.ok) {
        console.error('[send-2fa-code] Webhook failed:', await webhookResponse.text());
        throw new Error(`Webhook returned ${webhookResponse.status}`);
      }

      console.log('[send-2fa-code] Webhook sent successfully');
    } catch (webhookErr) {
      console.error('[send-2fa-code] Webhook error:', webhookErr);
      // Não falhar a requisição se webhook falhar - código já está salvo
    }

    // Mascarar identificador na resposta
    let maskedIdentifier = identifier;
    if (approver.identifier_type === 'email') {
      const [local, domain] = identifier.split('@');
      maskedIdentifier = `${local.substring(0, 2)}***@${domain}`;
    } else {
      maskedIdentifier = `***${identifier.slice(-4)}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Código enviado para ${maskedIdentifier}`,
        identifier_type: approver.identifier_type,
        expires_in_seconds: 600,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-2fa-code] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
