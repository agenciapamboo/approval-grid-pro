import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-ORPHANED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    // Check if super_admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      logStep("Authorization failed", { 
        userId: userData.user.id,
        roles: roles?.map(r => r.role),
        required: 'super_admin'
      });
      throw new Error("Unauthorized: Only super admins can fix orphaned users");
    }

    logStep("Admin authenticated");

    // Find client_users without client_id and with paid plans
    const { data: orphanedUsers, error: orphanedError } = await supabaseClient
      .from('profiles')
      .select('id, name, email, plan, agency_name, billing_cycle')
      .is('client_id', null)
      .is('agency_id', null)
      .in('plan', ['eugencia', 'socialmidia', 'fullservice']);

    if (orphanedError) throw orphanedError;

    logStep(`Found ${orphanedUsers.length} orphaned users`);

    let fixedCount = 0;
    const results = [];

    for (const user of orphanedUsers) {
      try {
        // Create agency for this user
        const { data: newAgency, error: agencyError } = await supabaseClient
          .from('agencies')
          .insert({
            name: user.agency_name || user.name || 'Agência',
            slug: (user.agency_name || user.name || 'agencia').toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '') + `-${user.id.substring(0, 8)}`,
            email: user.email,
            plan: user.plan,
            plan_type: user.billing_cycle,
          })
          .select()
          .single();

        if (agencyError) throw agencyError;

        // Update or insert user role to agency_admin
        const { error: roleUpdateError } = await supabaseClient
          .from('user_roles')
          .upsert({ 
            user_id: user.id,
            role: 'agency_admin',
            created_by: user.id
          }, { 
            onConflict: 'user_id,role' 
          });

        if (roleUpdateError) throw roleUpdateError;

        // Update profile with agency_id
        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update({ 
            agency_id: newAgency.id,
            account_type: 'agency',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (profileUpdateError) throw profileUpdateError;

        fixedCount++;
        results.push({
          user_id: user.id,
          user_email: user.email,
          agency_id: newAgency.id,
          agency_name: newAgency.name,
          status: 'fixed'
        });

        logStep(`Fixed user ${user.email}`, { agencyId: newAgency.id });
      } catch (error) {
        results.push({
          user_id: user.id,
          user_email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
        logStep(`Error fixing user ${user.email}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    logStep("Fix completed", { fixed: fixedCount, total: orphanedUsers.length });

    return new Response(JSON.stringify({ 
      success: true, 
      fixed: fixedCount,
      total: orphanedUsers.length,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = errorMessage.includes("Unauthorized");
    
    logStep("ERROR", { 
      error: errorMessage,
      type: error instanceof Error ? error.constructor.name : typeof error,
      isAuthError
    });

    return new Response(JSON.stringify({ 
      error: errorMessage,
      isAuthError
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isAuthError ? 403 : 500,
    });
  }
});