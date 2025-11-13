import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  identifier: string;
  code: string;
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
    const { identifier, code }: RequestBody = await req.json();

    if (!identifier || !code) {
      console.error('[verify-2fa-code] Missing identifier or code');
      return new Response(
        JSON.stringify({ error: 'Identificador e código são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-2fa-code] Verifying code for identifier: ${identifier.substring(0, 3)}***`);

    // Obter IP e User-Agent primeiro para validações
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Buscar código válido
    const { data: codeData, error: codeError } = await supabase
      .from('two_factor_codes')
      .select('id, approver_id, client_id, used_at, expires_at')
      .eq('code', code)
      .eq('identifier', identifier.trim())
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeData) {
      console.warn('[verify-2fa-code] Invalid or expired code');
      
      // Registrar tentativa falha
      await supabase
        .from('token_validation_attempts')
        .insert({
          ip_address: clientIP,
          token_attempted: code,
          success: false,
          user_agent: userAgent,
        });

      // Disparar alerta de segurança em background (não espera resposta)
      fetch(`${supabaseUrl}/functions/v1/alert-failed-2fa-attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          ip_address: clientIP,
          user_agent: userAgent,
          token_attempted: code.substring(0, 3) + '***',
          approver_identifier: identifier,
        }),
      }).catch(err => {
        console.error('⚠️ Erro ao disparar alerta de segurança:', err);
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Código inválido ou expirado. Solicite um novo código.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-2fa-code] Valid code found for approver: ${codeData.approver_id}`);

    // Marcar código como usado
    const { error: updateError } = await supabase
      .from('two_factor_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeData.id);

    if (updateError) {
      console.error('[verify-2fa-code] Error updating code:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar código' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar token de sessão
    const sessionToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Criar sessão
    const { error: sessionError } = await supabase
      .from('client_sessions')
      .insert({
        approver_id: codeData.approver_id,
        client_id: codeData.client_id,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
      });

    if (sessionError) {
      console.error('[verify-2fa-code] Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-2fa-code] Session created successfully for client: ${codeData.client_id}`);

    // Buscar dados do cliente para retornar
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, name, slug, logo_url')
      .eq('id', codeData.client_id)
      .single();

    // Buscar dados do aprovador
    const { data: approverData } = await supabase
      .from('client_approvers')
      .select('name, email, is_primary')
      .eq('id', codeData.approver_id)
      .single();

    // Registrar no log de atividades
    await supabase.from('activity_log').insert({
      entity: '2fa_login',
      action: 'login_success',
      entity_id: codeData.client_id,
      actor_user_id: null,
      metadata: {
        approver_id: codeData.approver_id,
        approver_name: approverData?.name,
        client_slug: clientData?.slug,
        ip_address: clientIP,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
        client: {
          id: clientData?.id || codeData.client_id,
          name: clientData?.name || 'Cliente',
          slug: clientData?.slug || '',
          logo_url: clientData?.logo_url,
        },
        approver: {
          name: approverData?.name || 'Aprovador',
          email: approverData?.email,
          is_primary: approverData?.is_primary || false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-2fa-code] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
