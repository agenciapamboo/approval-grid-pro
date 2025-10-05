import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminToken = req.headers.get('X-Admin-Token');
    const expectedToken = Deno.env.get('ADMIN_TASK_TOKEN');

    if (!adminToken || adminToken !== expectedToken) {
      console.error('Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting password reset for all users...');

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log(`Found ${users.length} users to update`);

    const newPassword = 'D024m002*';
    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const user of users) {
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) {
          console.error(`Failed to update password for ${user.email}:`, updateError);
          results.failed.push({ email: user.email!, error: updateError.message });
        } else {
          console.log(`Successfully updated password for ${user.email}`);
          results.success.push(user.email!);
        }
      } catch (error: any) {
        console.error(`Exception updating password for ${user.email}:`, error);
        results.failed.push({ email: user.email!, error: error.message });
      }
    }

    console.log('Password reset completed');
    console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

    return new Response(
      JSON.stringify({
        message: 'Password reset completed',
        total: users.length,
        success: results.success.length,
        failed: results.failed.length,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in force-reset-all-passwords:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
