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

    // 1. Find users with expired grace period (excluding skip_subscription_check users)
    const { data: expiredGracePeriod, error: gracePeriodError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, delinquent, grace_period_end, skip_subscription_check, account_type')
      .eq('delinquent', true)
      .eq('skip_subscription_check', false)
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

        // Criar notificações de conta bloqueada
        for (const user of expiredGracePeriod) {
          await supabaseClient.from('platform_notifications').insert({
            target_type: user.account_type === 'agency' ? 'agency' : 'creator',
            target_id: user.id,
            notification_type: 'account_suspended',
            title: '🚫 Conta bloqueada por inadimplência',
            message: `Sua conta foi bloqueada devido ao não pagamento. Você foi movido para o plano gratuito Creator. Para reativar, regularize seu pagamento.`,
            action_url: '/my-subscription',
            priority: 'critical',
            send_email: true,
            send_whatsapp: true,
            send_in_app: true,
            status: 'pending',
            deduplication_key: `account_suspended_${user.id}_${now}`
          });
        }
      }
    }

    // 2. Find users with canceled or unpaid subscriptions (excluding skip_subscription_check users)
    const { data: canceledUsers, error: canceledError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, subscription_status, skip_subscription_check, account_type')
      .in('subscription_status', ['canceled', 'unpaid'])
      .eq('skip_subscription_check', false)
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

        // Criar notificações de conta bloqueada
        for (const user of canceledUsers) {
          await supabaseClient.from('platform_notifications').insert({
            target_type: user.account_type === 'agency' ? 'agency' : 'creator',
            target_id: user.id,
            notification_type: 'account_suspended',
            title: '🚫 Conta bloqueada',
            message: `Sua assinatura foi cancelada e você foi movido para o plano gratuito Creator. Para reativar, acesse a área de assinatura.`,
            action_url: '/my-subscription',
            priority: 'critical',
            send_email: true,
            send_whatsapp: true,
            send_in_app: true,
            status: 'pending',
            deduplication_key: `account_suspended_${user.id}_${now}`
          });
        }
      }
    }

    // 3. Clean up expired subscriptions (excluding skip_subscription_check users)
    const { data: expiredSubscriptions, error: expiredError } = await supabaseClient
      .from('profiles')
      .select('id, name, plan, current_period_end, skip_subscription_check, account_type')
      .eq('skip_subscription_check', false)
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

        // Criar notificações de conta bloqueada
        for (const user of expiredSubscriptions) {
          await supabaseClient.from('platform_notifications').insert({
            target_type: user.account_type === 'agency' ? 'agency' : 'creator',
            target_id: user.id,
            notification_type: 'account_suspended',
            title: '🚫 Assinatura expirada',
            message: `Sua assinatura expirou e você foi movido para o plano gratuito Creator. Para renovar, acesse a área de assinatura.`,
            action_url: '/my-subscription',
            priority: 'critical',
            send_email: true,
            send_whatsapp: true,
            send_in_app: true,
            status: 'pending',
            deduplication_key: `account_suspended_${user.id}_${now}`
          });
        }
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
