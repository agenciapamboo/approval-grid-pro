import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super admin using RPC function
    const { data: userRole, error: roleError } = await supabaseClient.rpc("get_user_role", {
      _user_id: userData.user.id
    });

    if (roleError || userRole !== "super_admin") {
      throw new Error("Only super admins can view Stripe configuration");
    }

    // Get Stripe keys from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    // Determine mode from secret key
    let mode: "live" | "test" | "unknown" = "unknown";
    if (stripeSecretKey) {
      if (stripeSecretKey.startsWith("sk_live_")) {
        mode = "live";
      } else if (stripeSecretKey.startsWith("sk_test_")) {
        mode = "test";
      }
    }

    // Verify keys by attempting to list products (for secret key)
    let hasSecretKey = false;
    let secretKeyValid = false;
    if (stripeSecretKey) {
      hasSecretKey = true;
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2025-08-27.basil",
        });
        // Just try to access the API to verify the key is valid
        await stripe.products.list({ limit: 1 });
        secretKeyValid = true;
      } catch (error) {
        // Key might be invalid or API error
        secretKeyValid = false;
      }
    }

    const hasWebhookSecret = Boolean(stripeWebhookSecret);

    return new Response(
      JSON.stringify({
        mode,
        hasSecretKey,
        secretKeyValid,
        hasWebhookSecret,
        // Don't expose actual keys for security
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting Stripe config:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

