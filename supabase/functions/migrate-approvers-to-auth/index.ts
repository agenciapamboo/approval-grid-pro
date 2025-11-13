import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[migrate-approvers-to-auth] Starting migration...');

    // Buscar todos os aprovadores sem user_id
    const { data: approvers, error: fetchError } = await supabase
      .from('client_approvers')
      .select('*')
      .is('user_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch approvers: ${fetchError.message}`);
    }

    console.log(`[migrate-approvers-to-auth] Found ${approvers?.length || 0} approvers to migrate`);

    const results = {
      migrated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const approver of approvers || []) {
      try {
        console.log(`[migrate-approvers-to-auth] Processing approver: ${approver.email}`);

        // Verificar se já existe usuário com este email
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser?.users?.find((u) => u.email === approver.email);

        let userId: string;

        if (userExists) {
          console.log(`[migrate-approvers-to-auth] User already exists: ${approver.email}`);
          userId = userExists.id;
        } else {
          // Criar novo usuário
          const randomPassword = crypto.randomUUID() + crypto.randomUUID();
          
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: approver.email,
            password: randomPassword,
            email_confirm: true, // Auto-confirmar email
            user_metadata: {
              name: approver.name,
              is_approver: true,
            },
          });

          if (createError) {
            throw new Error(`Failed to create user: ${createError.message}`);
          }

          userId = newUser.user.id;
          console.log(`[migrate-approvers-to-auth] Created user: ${approver.email} (${userId})`);
        }

        // Verificar se role já existe
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('role', 'approver')
          .single();

        if (!existingRole) {
          // Inserir role 'approver'
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'approver',
            created_by: userId, // Self-created during migration
          });

          if (roleError) {
            throw new Error(`Failed to create role: ${roleError.message}`);
          }

          console.log(`[migrate-approvers-to-auth] Created role 'approver' for user ${userId}`);
        }

        // Atualizar client_approvers com user_id
        const { error: updateError } = await supabase
          .from('client_approvers')
          .update({ user_id: userId })
          .eq('id', approver.id);

        if (updateError) {
          throw new Error(`Failed to update client_approvers: ${updateError.message}`);
        }

        console.log(`[migrate-approvers-to-auth] Updated client_approvers for ${approver.email}`);
        results.migrated++;
      } catch (error) {
        console.error(`[migrate-approvers-to-auth] Error processing ${approver.email}:`, error);
        results.errors.push({
          approver_id: approver.id,
          email: approver.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[migrate-approvers-to-auth] Migration completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Migration completed: ${results.migrated} migrated, ${results.errors.length} errors`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[migrate-approvers-to-auth] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
