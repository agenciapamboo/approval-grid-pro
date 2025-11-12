import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_token, content_id, caption } = await req.json();

    console.log('[approver-edit-caption] Request received:', {
      content_id,
      has_session_token: !!session_token,
      caption_length: caption?.length
    });

    if (!session_token || !content_id || caption === undefined) {
      console.error('[approver-edit-caption] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'session_token, content_id e caption são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate 2FA session
    console.log('[approver-edit-caption] Validating session...');
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .select('approver_id, client_id')
      .eq('session_token', session_token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (sessionError) {
      console.error('[approver-edit-caption] Session query error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar sessão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!session) {
      console.error('[approver-edit-caption] Invalid or expired session');
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch approver name
    console.log('[approver-edit-caption] Fetching approver data...');
    const { data: approver, error: approverError } = await supabase
      .from('client_approvers')
      .select('name')
      .eq('id', session.approver_id)
      .maybeSingle();

    if (approverError) {
      console.error('[approver-edit-caption] Approver query error:', approverError);
    }

    const approverName = approver?.name || 'Aprovador';

    // Fetch current content and verify ownership
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('version, client_id')
      .eq('id', content_id)
      .maybeSingle();

    if (contentError || !content) {
      console.error('[approver-edit-caption] Content not found:', contentError);
      return new Response(
        JSON.stringify({ error: 'Conteúdo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify content belongs to approver's client
    if (content.client_id !== session.client_id) {
      console.error('[approver-edit-caption] Client mismatch');
      return new Response(
        JSON.stringify({ error: 'Sem permissão para editar este conteúdo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment version
    const newVersion = (content.version || 1) + 1;

    // Insert new caption version
    console.log('[approver-edit-caption] Inserting new caption version...');
    const { error: insertError } = await supabase
      .from('content_texts')
      .insert({
        content_id,
        version: newVersion,
        caption,
        edited_by_approver_id: session.approver_id,
        edited_by_approver_name: approverName,
        edited_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[approver-edit-caption] Insert error:', insertError);
      throw insertError;
    }

    // Update content version
    console.log('[approver-edit-caption] Updating content version...');
    const { error: updateError } = await supabase
      .from('contents')
      .update({ version: newVersion })
      .eq('id', content_id);

    if (updateError) {
      console.error('[approver-edit-caption] Update error:', updateError);
      throw updateError;
    }

    // Log activity
    console.log('[approver-edit-caption] Logging activity...');
    await supabase.from('activity_log').insert({
      entity: 'content',
      action: 'caption_edited',
      entity_id: content_id,
      approver_id: session.approver_id,
      approver_name: approverName,
      metadata: { content_id, new_version: newVersion }
    });

    // Update session last_activity
    await supabase
      .from('client_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', session_token);

    console.log('[approver-edit-caption] Caption edited successfully');

    return new Response(
      JSON.stringify({ success: true, version: newVersion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[approver-edit-caption] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
