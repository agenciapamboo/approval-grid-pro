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
      throw new Error("Only super admins can create products");
    }

    const {
      product_name,
      product_description,
      price_amount,
      price_currency,
      recurring_interval,
    } = await req.json();

    if (!product_name || !price_amount || !price_currency || !recurring_interval) {
      throw new Error("Missing required fields");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if product already exists
    let product;
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existing = existingProducts.data.find((p: Stripe.Product) => p.name === product_name);

    if (existing) {
      product = existing;
      console.log(`Using existing product: ${product.id}`);
    } else {
      // Create new product
      product = await stripe.products.create({
        name: product_name,
        description: product_description || undefined,
      });
      console.log(`Created new product: ${product.id}`);
    }

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: price_amount,
      currency: price_currency,
      recurring: {
        interval: recurring_interval as "month" | "year",
      },
    });

    console.log(`Created price: ${price.id}`);

    return new Response(
      JSON.stringify({
        product,
        price,
        message: "Product and price created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
