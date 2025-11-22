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
      throw new Error("Only super admins can validate Stripe keys");
    }

    // Get keys from request body
    const { secretKey, webhookSecret } = await req.json();

    if (!secretKey || !webhookSecret) {
      return new Response(
        JSON.stringify({ valid: false, error: "Secret key e webhook secret são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate secret key format
    if (!secretKey.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ valid: false, error: "Chave secreta deve começar com 'sk_'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate webhook secret format
    if (!webhookSecret.startsWith("whsec_")) {
      return new Response(
        JSON.stringify({ valid: false, error: "Webhook secret deve começar com 'whsec_'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Determine mode from secret key
    let mode: "live" | "test" | "unknown" = "unknown";
    if (secretKey.startsWith("sk_live_")) {
      mode = "live";
    } else if (secretKey.startsWith("sk_test_")) {
      mode = "test";
    }

    // Validate secret key with Stripe API
    try {
      const stripe = new Stripe(secretKey, {
        apiVersion: "2025-08-27.basil",
      });

      // Try to list products to verify the key works
      await stripe.products.list({ limit: 1 });

      // Key is valid
      return new Response(
        JSON.stringify({
          valid: true,
          mode,
          message: `Chaves validadas com sucesso! Modo: ${mode.toUpperCase()}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Stripe API error:", error);
      
      // Check if it's an authentication error
      if (error?.type === "StripeAuthenticationError" || error?.statusCode === 401) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Chave secreta inválida ou expirada",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({
          valid: false,
          error: `Erro ao validar chave: ${error.message || "Erro desconhecido"}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error("Error validating Stripe keys:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

