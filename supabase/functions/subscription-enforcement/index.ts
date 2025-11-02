import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-ENFORCEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Daily enforcement job started");

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();

    // 1. Find users with expired grace period
    const { data: expiredGracePeriod, error: gracePeriodError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, delinquent, grace_period_end')
      .eq('delinquent', true)
      .not('grace_period_end', 'is', null)
      .lt('grace_period_end', now);

    if (gracePeriodError) {
      logStep("Error fetching expired grace periods", { error: gracePeriodError.message });
    } else if (expiredGracePeriod && expiredGracePeriod.length > 0) {
      logStep("Found users with expired grace period", { count: expiredGracePeriod.length });

      // Downgrade to creator plan
      const { error: downgradeError } = await supabaseClient
        .from('profiles')
        .update({
          plan: 'creator',
          billing_cycle: null,
          subscription_status: 'canceled',
          is_pro: false,
          delinquent: false,
          grace_period_end: null,
          current_period_end: null,
          updated_at: now
        })
        .in('id', expiredGracePeriod.map(u => u.id));

      if (downgradeError) {
        logStep("Error downgrading expired users", { error: downgradeError.message });
      } else {
        logStep("Downgraded expired users to creator", { 
          count: expiredGracePeriod.length,
          userIds: expiredGracePeriod.map(u => u.id)
        });
      }
    }

    // 2. Find users with canceled or unpaid subscriptions (but not yet downgraded)
    const { data: canceledUsers, error: canceledError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, subscription_status')
      .in('subscription_status', ['canceled', 'unpaid'])
      .neq('plan', 'creator');

    if (canceledError) {
      logStep("Error fetching canceled users", { error: canceledError.message });
    } else if (canceledUsers && canceledUsers.length > 0) {
      logStep("Found users with canceled/unpaid subscriptions", { count: canceledUsers.length });

      // Downgrade to creator plan
      const { error: downgradeError } = await supabaseClient
        .from('profiles')
        .update({
          plan: 'creator',
          billing_cycle: null,
          is_pro: false,
          delinquent: false,
          grace_period_end: null,
          current_period_end: null,
          updated_at: now
        })
        .in('id', canceledUsers.map(u => u.id));

      if (downgradeError) {
        logStep("Error downgrading canceled users", { error: downgradeError.message });
      } else {
        logStep("Downgraded canceled users to creator", { 
          count: canceledUsers.length,
          userIds: canceledUsers.map(u => u.id)
        });
      }
    }

    // 3. Clean up expired subscriptions (current_period_end passed)
    const { data: expiredSubscriptions, error: expiredError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, current_period_end')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', now)
      .not('subscription_status', 'in', '("canceled","unpaid")');

    if (expiredError) {
      logStep("Error fetching expired subscriptions", { error: expiredError.message });
    } else if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      logStep("Found users with expired subscriptions", { count: expiredSubscriptions.length });

      // Mark as expired and downgrade
      const { error: expireError } = await supabaseClient
        .from('profiles')
        .update({
          plan: 'creator',
          billing_cycle: null,
          subscription_status: 'canceled',
          is_pro: false,
          delinquent: false,
          grace_period_end: null,
          current_period_end: null,
          updated_at: now
        })
        .in('id', expiredSubscriptions.map(u => u.id));

      if (expireError) {
        logStep("Error expiring subscriptions", { error: expireError.message });
      } else {
        logStep("Expired and downgraded subscriptions", { 
          count: expiredSubscriptions.length,
          userIds: expiredSubscriptions.map(u => u.id)
        });
      }
    }

    const summary = {
      expiredGracePeriod: expiredGracePeriod?.length || 0,
      canceledUsers: canceledUsers?.length || 0,
      expiredSubscriptions: expiredSubscriptions?.length || 0,
      timestamp: now
    };

    logStep("Daily enforcement job completed", summary);

    return new Response(
      JSON.stringify({ success: true, summary }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in enforcement job", { error: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
