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

    // Buscar user_id do aprovador
    const { data: approverData, error: approverError } = await supabase
      .from('client_approvers')
      .select('user_id, name, email, is_primary, agency_id, client_id')
      .eq('id', codeData.approver_id)
      .single();

    if (approverError || !approverData?.user_id) {
      console.error('[verify-2fa-code] Error fetching approver user_id:', approverError);
      return new Response(
        JSON.stringify({ 
          error: 'Aprovador não possui conta de usuário. Execute a migração de aprovadores.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-2fa-code] Creating Supabase session for user ${approverData.user_id}`);

    // Confirmar email do usuário
    const { data: { user }, error: userUpdateError } = await supabase.auth.admin.updateUserById(
      approverData.user_id,
      { 
        email_confirm: true,
      }
    );

    if (userUpdateError) {
      console.error('[verify-2fa-code] Error confirming user:', userUpdateError);
    }

    // Gerar tokens via admin API usando generateLink com magiclink
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: approverData.email,
    });

    if (linkError || !linkData) {
      console.error('[verify-2fa-code] Error generating auth link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair hash do link mágico e criar sessão
    const hashMatch = linkData.properties.action_link.match(/#(.+)$/);
    if (!hashMatch) {
      console.error('[verify-2fa-code] Could not extract hash from magic link');
      return new Response(
        JSON.stringify({ error: 'Erro ao processar link de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hash = hashMatch[1];
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: hash,
      type: 'magiclink',
    });

    if (sessionError || !sessionData?.session) {
      console.error('[verify-2fa-code] Error creating session from magic link:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-2fa-code] Session created successfully');

    console.log('[verify-2fa-code] Approver data:', {
      approver_id: codeData.approver_id,
      user_id: approverData.user_id,
      client_id: approverData.client_id,
      agency_id: approverData.agency_id
    });

    // Buscar cliente E agência em PARALELO (mais rápido)
    const [clientResult, agencyResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, slug, logo_url')
        .eq('id', approverData.client_id)
        .single(),
      supabase
        .from('agencies')
        .select('id, slug, name')
        .eq('id', approverData.agency_id)
        .single()
    ]);

    const { data: clientData, error: clientError} = clientResult;
    const { data: agencyData, error: agencyError } = agencyResult;

    if (clientError || !clientData) {
      console.error('[verify-2fa-code] Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado no sistema' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (agencyError || !agencyData) {
      console.error('[verify-2fa-code] Error fetching agency:', agencyError);
      return new Response(
        JSON.stringify({ error: 'Agência não encontrada no sistema' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar slugs antes de retornar
    if (!clientData.slug || !agencyData.slug) {
      console.error('[verify-2fa-code] Missing slugs:', {
        client_slug: clientData.slug,
        agency_slug: agencyData.slug
      });
      return new Response(
        JSON.stringify({ error: 'Dados incompletos do cliente ou agência' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar no log de atividades
    await supabase.from('activity_log').insert({
      entity: '2fa_login',
      action: 'login_success',
      entity_id: codeData.client_id,
      actor_user_id: approverData.user_id,
      metadata: {
        approver_id: codeData.approver_id,
        approver_name: approverData.name,
        client_slug: clientData.slug,
        agency_slug: agencyData.slug,
        ip_address: clientIP,
      },
    });

    console.log(`[verify-2fa-code] 2FA login successful for ${approverData.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        client: {
          id: clientData.id,
          name: clientData.name,
          slug: clientData.slug,
          logo_url: clientData.logo_url,
        },
        agency: {
          id: agencyData.id,
          slug: agencyData.slug,
          name: agencyData.name,
        },
        approver: {
          id: codeData.approver_id,
          name: approverData.name,
          email: approverData.email,
          is_primary: approverData.is_primary,
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
