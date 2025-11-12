import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  session_token: string;
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
    const { session_token }: RequestBody = await req.json();

    if (!session_token) {
      console.error('[validate-client-session] Missing session token');
      return new Response(
        JSON.stringify({ valid: false, error: 'Token de sessão é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-client-session] Validating session: ${session_token.substring(0, 8)}***`);

    // Buscar sessão válida
    const { data: sessionData, error: sessionError } = await supabase
      .from('client_sessions')
      .select(`
        id,
        approver_id,
        client_id,
        expires_at,
        last_activity,
        client_approvers (
          name,
          email,
          is_primary,
          is_active
        ),
        clients (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('session_token', session_token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      console.warn('[validate-client-session] Session not found or expired');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Sessão inválida ou expirada. Faça login novamente.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se aprovador está ativo
    const approver = Array.isArray(sessionData.client_approvers) 
      ? sessionData.client_approvers[0] 
      : sessionData.client_approvers;

    if (!approver || !approver.is_active) {
      console.warn('[validate-client-session] Approver is inactive');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Aprovador desativado. Contate a agência.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-client-session] Valid session for client: ${sessionData.client_id}`);

    // Atualizar última atividade (apenas se passou mais de 1 minuto)
    const lastActivity = new Date(sessionData.last_activity);
    const now = new Date();
    const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / 1000 / 60;

    if (minutesSinceLastActivity > 1) {
      await supabase
        .from('client_sessions')
        .update({ last_activity: now.toISOString() })
        .eq('id', sessionData.id);
    }

    const client = Array.isArray(sessionData.clients) 
      ? sessionData.clients[0] 
      : sessionData.clients;

    return new Response(
      JSON.stringify({
        valid: true,
        session: {
          approver_id: sessionData.approver_id,
          client_id: sessionData.client_id,
          expires_at: sessionData.expires_at,
        },
        client: {
          id: client?.id || sessionData.client_id,
          name: client?.name || 'Cliente',
          slug: client?.slug || '',
          logo_url: client?.logo_url,
        },
        approver: {
          name: approver?.name || 'Aprovador',
          email: approver?.email,
          is_primary: approver?.is_primary || false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[validate-client-session] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
