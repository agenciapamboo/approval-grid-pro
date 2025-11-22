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

    console.log("User role check:", { userRole, roleError });

    if (roleError || userRole !== "super_admin") {
      throw new Error("Only super admins can list prices");
    }

    // Try to get limit from request body, fallback to query params or default
    let limit = 20;
    try {
      const body = await req.json();
      limit = body.limit || 20;
    } catch {
      // If JSON parsing fails, try query params
      const url = new URL(req.url);
      limit = parseInt(url.searchParams.get("limit") || "20", 10);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Determine Stripe mode from API key
    const isLiveMode = stripeKey.startsWith("sk_live_");
    const mode = isLiveMode ? "live" : "test";
    
    console.log(`Stripe mode: ${mode} (key starts with ${stripeKey.substring(0, 7)})`);

    const prices = await stripe.prices.list({ limit, expand: ["data.product"], active: true });
    
    // Stripe API automatically returns only prices from the mode of the API key
    // (live prices when using sk_live_*, test prices when using sk_test_*)
    // We'll filter out any test prices as an extra safety measure
    const filteredPrices = isLiveMode 
      ? prices.data.filter(p => !p.id.includes("_test_"))
      : prices.data;
    
    console.log(`Stripe prices fetched: ${prices.data.length} total, ${filteredPrices.length} in ${mode} mode`);

    return new Response(
      JSON.stringify({ 
        prices: filteredPrices,
        mode,
        totalCount: prices.data.length,
        filteredCount: filteredPrices.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error listing prices:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
