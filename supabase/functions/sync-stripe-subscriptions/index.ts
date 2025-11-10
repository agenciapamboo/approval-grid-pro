import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
      throw new Error("Unauthorized: Only super admins can sync subscriptions");
    }

    logStep("Admin authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all users with stripe_customer_id
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, stripe_customer_id, stripe_subscription_id')
      .not('stripe_customer_id', 'is', null);

    if (profilesError) throw profilesError;

    logStep(`Found ${profiles.length} profiles with Stripe customers`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      try {
        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const productId = subscription.items.data[0].price.product;

          // Map product ID to plan
          const productToPlan: Record<string, string> = {
            'prod_TOmNQqnBSOTgC6': 'eugencia',
            'prod_TOmOccSkOPId3E': 'socialmidia',
            'prod_TOmS1DcVAM4lUE': 'fullservice',
          };

          const plan = productToPlan[productId as string] || 'creator';
          const billingCycle = subscription.items.data[0].price.recurring?.interval === 'year' ? 'annual' : 'monthly';

          // Update profile
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
              stripe_subscription_id: subscription.id,
              plan: plan,
              billing_cycle: billingCycle,
              is_pro: true,
              subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              delinquent: false,
              grace_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

          if (updateError) {
            logStep(`Error updating profile ${profile.id}`, { error: updateError.message });
            errorCount++;
          } else {
            syncedCount++;
          }
        }
      } catch (error) {
        logStep(`Error processing profile ${profile.id}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        errorCount++;
      }
    }

    logStep("Sync completed", { synced: syncedCount, errors: errorCount });

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount,
      errors: errorCount,
      total: profiles.length
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