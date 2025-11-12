import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_token, content_id, body } = await req.json();

    console.log('[approver-add-comment] Request received:', {
      content_id,
      has_session_token: !!session_token,
      body_length: body?.length
    });

    if (!session_token || !content_id || !body) {
      console.error('[approver-add-comment] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'session_token, content_id e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate 2FA session
    console.log('[approver-add-comment] Validating session...');
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .select('approver_id, client_id')
      .eq('session_token', session_token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError) {
      console.error('[approver-add-comment] Session query error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('[approver-add-comment] Invalid or expired session');
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch approver name
    console.log('[approver-add-comment] Fetching approver data...');
    const { data: approver, error: approverError } = await supabase
      .from('client_approvers')
      .select('name')
      .eq('id', session.approver_id)
      .maybeSingle();

    if (approverError) {
      console.error('[approver-add-comment] Approver query error:', approverError);
    }

    const approverName = approver?.name || 'Aprovador';

    // Fetch current content version
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('version, client_id')
      .eq('id', content_id)
      .maybeSingle();

    if (contentError || !content) {
      console.error('[approver-add-comment] Content not found:', contentError);
      return new Response(
        JSON.stringify({ error: 'Conteúdo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify content belongs to approver's client
    if (content.client_id !== session.client_id) {
      console.error('[approver-add-comment] Client mismatch');
      return new Response(
        JSON.stringify({ error: 'Sem permissão para comentar neste conteúdo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert comment
    console.log('[approver-add-comment] Inserting comment...');
    const { error: insertError } = await supabase
      .from('comments')
      .insert({
        content_id,
        body,
        approver_id: session.approver_id,
        approver_name: approverName,
        version: content.version || 1,
        is_adjustment_request: false
      });

    if (insertError) {
      console.error('[approver-add-comment] Insert error:', insertError);
      throw insertError;
    }

    // Log activity
    console.log('[approver-add-comment] Logging activity...');
    await supabase.from('activity_log').insert({
      entity: 'comment',
      action: 'created',
      entity_id: content_id,
      approver_id: session.approver_id,
      approver_name: approverName,
      metadata: { body, content_id }
    });

    // Update session last_activity
    await supabase
      .from('client_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', session_token);

    console.log('[approver-add-comment] Comment added successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[approver-add-comment] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
