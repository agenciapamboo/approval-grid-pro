import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[approve-content] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { content_id, approved, adjustment_reason } = await req.json();

    if (!content_id) {
      return new Response(
        JSON.stringify({ error: 'Missing content_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[approve-content] User:', user.id, 'Content:', content_id, 'Approved:', approved);

    // Validate user role SERVER-SIDE
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = userRoles?.map(r => r.role) || [];
    console.log('[approve-content] User roles:', roles);

    const canApprove = roles.includes('super_admin') || 
                       roles.includes('agency_admin') || 
                       roles.includes('approver');

    if (!canApprove) {
      console.error('[approve-content] User not authorized:', user.id);
      return new Response(
        JSON.stringify({ error: 'Not authorized to approve content' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content and verify access
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('*, clients!inner(agency_id)')
      .eq('id', content_id)
      .maybeSingle();

    if (contentError || !content) {
      console.error('[approve-content] Content not found:', contentError);
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this content's client
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, client_id')
      .eq('id', user.id)
      .maybeSingle();

    const hasAccess = roles.includes('super_admin') ||
                      (roles.includes('agency_admin') && profile?.agency_id === content.clients.agency_id) ||
                      (roles.includes('approver') && profile?.client_id === content.client_id);

    if (!hasAccess) {
      console.error('[approve-content] User does not have access to this content');
      return new Response(
        JSON.stringify({ error: 'Access denied to this content' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update content status
    const newStatus = approved ? 'approved' : 'changes_requested';
    const { error: updateError } = await supabase
      .from('contents')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', content_id);

    if (updateError) {
      console.error('[approve-content] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add comment if adjustment requested
    if (!approved && adjustment_reason) {
      await supabase
        .from('comments')
        .insert({
          content_id,
          author_user_id: user.id,
          body: adjustment_reason,
          is_adjustment_request: true,
          adjustment_reason,
          version: content.version
        });
    }

    console.log('[approve-content] Success - Content:', content_id, 'New status:', newStatus);

    return new Response(
      JSON.stringify({ 
        success: true,
        content_id,
        status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[approve-content] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
