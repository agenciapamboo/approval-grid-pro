import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Lookup keys mapping based on plan and billing cycle
const LOOKUP_KEYS: Record<string, Record<string, string>> = {
  eugencia: {
    monthly: "plano_eugencia_mensal",
    annual: "plano_eugencia_anual",
  },
  socialmidia: {
    monthly: "plano_mensal_socialmidia",
    annual: "plano_anual_socialmidia",
  },
  fullservice: {
    monthly: "plano_agencia_mensal",
    annual: "plano_agencia_anual",
  },
};

// Validation schema
interface CheckoutRequest {
  plan: "eugencia" | "socialmidia" | "fullservice";
  billingCycle: "monthly" | "annual";
}

const validateRequest = (body: any): { valid: boolean; error?: string; data?: CheckoutRequest } => {
  if (!body.plan || !body.billingCycle) {
    return { valid: false, error: "Missing required fields: plan and billingCycle" };
  }

  const validPlans = ["eugencia", "socialmidia", "fullservice"];
  if (!validPlans.includes(body.plan)) {
    return { valid: false, error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` };
  }

  const validCycles = ["monthly", "annual"];
  if (!validCycles.includes(body.billingCycle)) {
    return { valid: false, error: `Invalid billingCycle. Must be one of: ${validCycles.join(", ")}` };
  }

  return {
    valid: true,
    data: {
      plan: body.plan as CheckoutRequest["plan"],
      billingCycle: body.billingCycle as CheckoutRequest["billingCycle"],
    },
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Initialize Supabase client
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      logStep("Validation failed", { error: validation.error });
      return new Response(JSON.stringify({ error: validation.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { plan, billingCycle } = validation.data!;
    logStep("Request validated", { plan, billingCycle });

    // Get lookup key for the plan and billing cycle
    const lookupKey = LOOKUP_KEYS[plan]?.[billingCycle];
    if (!lookupKey) {
      logStep("Invalid plan/cycle combination", { plan, billingCycle });
      throw new Error("Invalid plan and billing cycle combination");
    }
    logStep("Lookup key found", { lookupKey });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Try to get price using lookup key first, then fallback to price_id
    let priceId: string | null = null;

    try {
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      if (prices.data && prices.data.length > 0) {
        priceId = prices.data[0].id;
        logStep("Price found via lookup_key", { priceId, amount: prices.data[0].unit_amount });
      }
    } catch (error: any) {
      logStep("Failed to find price via lookup_key", { lookupKey, error: error?.message || String(error) });
    }

    // Fallback to price_id from config if lookup_key failed
    if (!priceId) {
      // Import STRIPE_PRODUCTS configuration
      const STRIPE_PRODUCTS_CONFIG: any = {
        eugencia: {
          prices: {
            monthly: { price_id: "price_1SOnIVH3HtGAQtCFzBULcf82" },
            annual: { price_id: "price_1SOnIVH3HtGAQtCFzWjKEOHT" },
          },
        },
        socialmidia: {
          prices: {
            monthly: { price_id: "price_1SOnTYH3HtGAQtCFEOcgf8es" },
            annual: { price_id: "price_1SOnTYH3HtGAQtCFpT8ozygI" },
          },
        },
        fullservice: {
          prices: {
            monthly: { price_id: "price_1SOqUQH3HtGAQtCFgUwrjiiR" },
            annual: { price_id: "price_1SOqUQH3HtGAQtCFjkpz8CbF" },
          },
        },
      };

      priceId = STRIPE_PRODUCTS_CONFIG[plan]?.prices?.[billingCycle]?.price_id;
      if (priceId) {
        logStep("Using fallback price_id from config", { priceId });
      } else {
        logStep("ERROR: No price found via lookup_key or price_id", { plan, billingCycle, lookupKey });
        throw new Error(
          `Erro ao processar plano. Configure os preços no Stripe com lookup_key "${lookupKey}" ou adicione price_id na configuração.`,
        );
      }
    }

    // Get user profile to check for existing Stripe customer ID
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    logStep("Profile checked", { hasExistingCustomer: !!customerId });

    // If customer exists, verify it in Stripe
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        logStep("Existing Stripe customer verified", { customerId });
      } catch (error) {
        logStep("Existing customer ID invalid, will create new one", { customerId });
        customerId = null;
      }
    }

    // Get site URL for redirects
    const siteUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://aprovacriativos.com.br";

    // Get idempotency key from header
    const idempotencyKey = req.headers.get("idempotency-key") || `checkout-${user.id}-${Date.now()}`;
    logStep("Idempotency key", { key: idempotencyKey });

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/planos?canceled=1`,
      metadata: {
        user_id: user.id,
        plan: plan,
        billing_cycle: billingCycle,
      },
    };

    // Add customer or enable customer creation
    if (customerId) {
      sessionParams.customer = customerId;
      logStep("Using existing customer");
    } else {
      sessionParams.customer_creation = "always";
      sessionParams.customer_email = user.email;
      logStep("Will create new customer");
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey,
    });

    logStep("Checkout session created", {
      sessionId: session.id,
      url: session.url,
      customer: session.customer,
    });

    // If a new customer was created, store the customer ID
    if (!customerId && session.customer) {
      const newCustomerId = typeof session.customer === "string" ? session.customer : session.customer.id;

      await supabaseClient.from("profiles").update({ stripe_customer_id: newCustomerId }).eq("id", user.id);

      logStep("Customer ID saved to profile", { customerId: newCustomerId });
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
