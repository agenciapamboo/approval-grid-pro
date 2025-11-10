import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify caller is super_admin
    const { data: callerRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'super_admin' });

    if (!callerRole) {
      throw new Error('Only super admins can edit users');
    }

    const { userId, updates } = await req.json();

    if (!userId || !updates) {
      throw new Error('Missing required fields');
    }

    // Prevent self-editing
    if (userId === user.id) {
      throw new Error('Cannot edit your own user');
    }

    // Prevent creating super_admin via API
    if (updates.role === 'super_admin') {
      throw new Error('Cannot assign super_admin role via API');
    }

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      throw new Error('User not found');
    }

    // Validate client_id exists if provided
    if (updates.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', updates.client_id)
        .single();
      
      if (!client) {
        throw new Error('Client not found');
      }
    }

    // Validate agency_id exists if provided
    if (updates.agency_id) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('id', updates.agency_id)
        .single();
      
      if (!agency) {
        throw new Error('Agency not found');
      }
    }

    // Validate role consistency
    if (updates.role === 'client_user' && !updates.client_id) {
      throw new Error('client_user role requires a client_id');
    }

    if (updates.role === 'agency_admin' && !updates.agency_id) {
      throw new Error('agency_admin role requires an agency_id');
    }

    if (updates.role === 'creator' && (updates.client_id || updates.agency_id)) {
      throw new Error('creator role should not have client_id or agency_id');
    }

    // Update profiles
    const profileUpdates: any = {};
    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.client_id !== undefined) profileUpdates.client_id = updates.client_id || null;
    if (updates.agency_id !== undefined) profileUpdates.agency_id = updates.agency_id || null;
    if (updates.account_type !== undefined) profileUpdates.account_type = updates.account_type;

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (profileError) {
      throw profileError;
    }

    // Update user_roles if role changed
    if (updates.role && updates.role !== currentUser.user_roles?.[0]?.role) {
      // Delete old role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: updates.role,
          created_by: user.id
        });

      if (roleError) {
        throw roleError;
      }
    }

    // Log activity
    await supabase
      .from('activity_log')
      .insert({
        entity: 'user',
        action: 'profile_updated',
        entity_id: userId,
        actor_user_id: user.id,
        metadata: {
          updates,
          previous: {
            name: currentUser.name,
            client_id: currentUser.client_id,
            agency_id: currentUser.agency_id,
            account_type: currentUser.account_type,
            role: currentUser.user_roles?.[0]?.role
          }
        }
      });

    console.log(`User ${userId} updated by ${user.email}:`, updates);

    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error editing user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
