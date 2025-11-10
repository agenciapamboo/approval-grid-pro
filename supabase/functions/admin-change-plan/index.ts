import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-CHANGE-PLAN] ${step}${detailsStr}`);
};

const logError = (error: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.error(`[ADMIN-CHANGE-PLAN ERROR] ${error}${detailsStr}`);
};

// Stripe product configuration
const STRIPE_PRODUCTS = {
  creator: {
    id: "prod_TLU5r2YFEPikQ7",
    free: true,
  },
  eugencia: {
    id: "prod_TLUHBx7ZnfIvX7",
    prices: {
      monthly: { lookup_key: "plano_eugencia_mensal", amount: 2970 },
      annual: { lookup_key: "plano_eugencia_anual", amount: 27000 },
    },
  },
  socialmidia: {
    id: "prod_TLUSSunwc1e3z3",
    prices: {
      monthly: { lookup_key: "plano_mensal_socialmidia", amount: 4950 },
      annual: { lookup_key: "plano_anual_socialmidia", amount: 49500 },
    },
  },
  fullservice: {
    id: "prod_TLXZljt4VYKjyA",
    prices: {
      monthly: { lookup_key: "plano_agencia_mensal", amount: 9720 },
      annual: { lookup_key: "plano_agencia_anual", amount: 97200 },
    },
  },
  unlimited: {
    id: "prod_internal_unlimited",
    free: true,
  },
  free: {
    id: "prod_free",
    free: true,
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);

    const user = userData.user;
    if (!user) throw new Error("User not found");

    // Verificar se é super_admin
    const { data: roleData, error: roleError } = await supabaseClient.rpc("get_user_role", { _user_id: user.id });

    if (roleError || roleData !== "super_admin") {
      throw new Error("Unauthorized: Only super_admin can change plans");
    }

    logStep("Super admin verified", { userId: user.id });

    // Parse request
    const { agency_id, new_plan, billing_cycle } = await req.json();

    if (!agency_id || !new_plan) {
      throw new Error("Missing required fields: agency_id and new_plan");
    }

    logStep("Request parsed", { agency_id, new_plan, billing_cycle });

    // Buscar agência primeiro
    const { data: agency, error: agencyError } = await supabaseClient
      .from("agencies")
      .select("email")
      .eq("id", agency_id)
      .single();

    if (agencyError || !agency) {
      throw new Error("Agency not found");
    }

    // Buscar email do admin da agência via RPC
    const { data: adminEmailFromRpc, error: emailError } = await supabaseClient.rpc("get_agency_admin_email", {
      agency_id_param: agency_id,
    });

    // Usar email do RPC se disponível, senão usar email da agência
    const adminEmail = adminEmailFromRpc || agency.email;

    if (!adminEmail) {
      throw new Error("Agency email not found. Please configure an email for the agency.");
    }

    logStep("Agency email found", { adminEmail, source: adminEmailFromRpc ? "admin_profile" : "agency_table" });

    // Buscar perfil do admin se existir, ou buscar qualquer perfil da agência
    let adminProfile = null;

    const { data: adminProfiles, error: adminProfileError } = await supabaseClient
      .from("profiles")
      .select("id, stripe_customer_id, stripe_subscription_id")
      .eq("agency_id", agency_id)
      .limit(1);

    if (!adminProfileError && adminProfiles && adminProfiles.length > 0) {
      adminProfile = adminProfiles[0];
      logStep("Agency profile found", { adminId: adminProfile.id });
    } else {
      // Se não houver perfil com agency_id, criar um perfil virtual para a agência
      // Vamos buscar na tabela de agencies o plan atual
      logStep("No agency profile found, will use agency email directly");
      adminProfile = {
        id: null, // Será tratado como novo customer
        stripe_customer_id: null,
        stripe_subscription_id: null,
      };
    }

    // Inicializar Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verificar/criar Stripe customer
    let customerId = adminProfile.stripe_customer_id;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: adminEmail, limit: 1 });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: adminEmail,
          metadata: {
            agency_id: agency_id,
            admin_user_id: adminProfile.id,
          },
        });
        customerId = customer.id;
        logStep("New Stripe customer created", { customerId });
      }

      // Atualizar perfil com customer_id (se existir perfil)
      if (adminProfile.id) {
        await supabaseClient.from("profiles").update({ stripe_customer_id: customerId }).eq("id", adminProfile.id);
      }
    }

    // Verificar se é plano gratuito
    const productConfig = STRIPE_PRODUCTS[new_plan as keyof typeof STRIPE_PRODUCTS];
    if (!productConfig) {
      throw new Error(`Invalid plan: ${new_plan}`);
    }

    const isFree = "free" in productConfig && productConfig.free;

    // Se plano gratuito, cancelar subscription existente
    if (isFree) {
      if (adminProfile.stripe_subscription_id) {
        logStep("Canceling existing subscription", { subscriptionId: adminProfile.stripe_subscription_id });

        await stripe.subscriptions.cancel(adminProfile.stripe_subscription_id);
        logStep("Subscription canceled");
      }

      // Atualizar perfil (se existir)
      if (adminProfile.id) {
        await supabaseClient
          .from("profiles")
          .update({
            stripe_subscription_id: null,
            plan: new_plan,
            billing_cycle: null,
            subscription_status: null,
            current_period_end: null,
            is_pro: false,
            plan_renewal_date: null,
            delinquent: false,
            grace_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", adminProfile.id);
      }

      // Atualizar agência
      await supabaseClient
        .from("agencies")
        .update({
          plan: new_plan,
          plan_type: null,
          last_payment_date: null,
          plan_renewal_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agency_id);

      logStep("Plan updated to free");

      return new Response(
        JSON.stringify({
          success: true,
          message: `Plano alterado para ${new_plan} (gratuito)`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Plano pago - requer billing_cycle
    if (!billing_cycle || !["monthly", "annual"].includes(billing_cycle)) {
      throw new Error("Billing cycle required for paid plans (monthly or annual)");
    }

    // Buscar price_id
    const priceConfig = (productConfig as any).prices[billing_cycle];
    if (!priceConfig) {
      throw new Error(`Price not found for plan ${new_plan} and cycle ${billing_cycle}`);
    }

    logStep("Price config found", { lookup_key: priceConfig.lookup_key, amount: priceConfig.amount });

    // Get price using lookup_key - Stripe is the single source of truth
    const prices = await stripe.prices.list({
      lookup_keys: [priceConfig.lookup_key],
      limit: 1,
    });

    if (!prices.data || prices.data.length === 0) {
      logStep("ERROR: Price not found in Stripe", { 
        lookupKey: priceConfig.lookup_key, 
        plan: new_plan, 
        billingCycle: billing_cycle 
      });
      throw new Error(
        `Preço não encontrado no Stripe. ` +
        `Certifique-se de que existe um preço com lookup_key "${priceConfig.lookup_key}". ` +
        `Configure em: https://dashboard.stripe.com/prices`
      );
    }

    const priceId = prices.data[0].id;
    logStep("Stripe price found via lookup_key", { priceId });

    // Cancelar subscription antiga se existir
    if (adminProfile.stripe_subscription_id) {
      logStep("Canceling old subscription", { subscriptionId: adminProfile.stripe_subscription_id });
      await stripe.subscriptions.cancel(adminProfile.stripe_subscription_id);
    }

    // Criar nova subscription
    logStep("Creating new subscription", { customerId, priceId });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    logStep("Subscription created", {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });

    const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();

    // Atualizar perfil (se existir)
    if (adminProfile.id) {
      await supabaseClient
        .from("profiles")
        .update({
          stripe_subscription_id: subscription.id,
          plan: new_plan,
          billing_cycle: billing_cycle,
          subscription_status: subscription.status,
          current_period_end: nextBillingDate,
          is_pro: subscription.status === "active" || subscription.status === "trialing",
          plan_renewal_date: nextBillingDate,
          delinquent: false,
          grace_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adminProfile.id);
    }

    // Atualizar agência
    await supabaseClient
      .from("agencies")
      .update({
        plan: new_plan,
        plan_type: billing_cycle,
        last_payment_date: new Date().toISOString(),
        plan_renewal_date: nextBillingDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agency_id);

    logStep("Database updated successfully");

    // Pegar payment intent URL se necessário
    let paymentUrl = null;
    if (subscription.status === "incomplete") {
      const latestInvoice = subscription.latest_invoice as any;
      if (latestInvoice?.payment_intent?.client_secret) {
        paymentUrl = `https://checkout.stripe.com/pay/${latestInvoice.payment_intent.client_secret}`;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plano alterado para ${new_plan} (${billing_cycle === "monthly" ? "mensal" : "anual"})`,
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        next_billing_date: nextBillingDate,
        payment_url: paymentUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
