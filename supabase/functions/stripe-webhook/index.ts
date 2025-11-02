import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const logError = (error: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.error(`[STRIPE-WEBHOOK] ERROR: ${error}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    // Get Stripe keys
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logError("No stripe-signature header found");
      return new Response("No signature", { status: 400 });
    }

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logError("Webhook signature verification failed", { error: errorMessage });
      return new Response("Invalid signature", { status: 400 });
    }

    // Initialize Supabase client with service role for write access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        // Get metadata from session
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const billingCycle = session.metadata?.billing_cycle;

        if (!userId) {
          logError("No user_id in session metadata", { sessionId: session.id });
          break;
        }

        // Get subscription details
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id;

        if (!subscriptionId) {
          logError("No subscription ID found", { sessionId: session.id });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        logStep("Subscription retrieved", {
          subscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
        });

        // Update user profile
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            plan: plan,
            billing_cycle: billingCycle,
            is_pro: true,
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            delinquent: false,
            grace_period_end: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          logError("Failed to update profile", { userId, error: updateError.message });
        } else {
          logStep("Profile updated successfully", { userId, plan, status: subscription.status });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer
        });

        // Find user by subscription ID
        const { data: profile, error: findError } = await supabaseClient
          .from('profiles')
          .select('id, plan')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (findError || !profile) {
          logError("Profile not found for subscription", { 
            subscriptionId: subscription.id,
            error: findError?.message 
          });
          break;
        }

        // Prepare update data
        const updateData: any = {
          subscription_status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        };

        // Handle past_due status - set grace period
        if (subscription.status === 'past_due') {
          updateData.delinquent = true;
          // Set grace period to 5 days from now
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5);
          updateData.grace_period_end = gracePeriodEnd.toISOString();
          logStep("Setting grace period", { 
            userId: profile.id,
            gracePeriodEnd: updateData.grace_period_end 
          });
        } else if (subscription.status === 'active') {
          // Clear delinquency if subscription becomes active again
          updateData.delinquent = false;
          updateData.grace_period_end = null;
          updateData.is_pro = true;
        }

        // Update profile
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          logError("Failed to update profile", { userId: profile.id, error: updateError.message });
        } else {
          logStep("Profile updated successfully", { 
            userId: profile.id, 
            status: subscription.status,
            delinquent: updateData.delinquent 
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription
        });

        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (!subscriptionId) {
          logError("No subscription ID in invoice", { invoiceId: invoice.id });
          break;
        }

        // Find user by subscription ID
        const { data: profile, error: findError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (findError || !profile) {
          logError("Profile not found for subscription", { 
            subscriptionId,
            error: findError?.message 
          });
          break;
        }

        // Set/renew grace period (5 days)
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5);

        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            delinquent: true,
            grace_period_end: gracePeriodEnd.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          logError("Failed to update profile", { userId: profile.id, error: updateError.message });
        } else {
          logStep("Profile marked as delinquent", { 
            userId: profile.id,
            gracePeriodEnd: gracePeriodEnd.toISOString()
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });

        // Find user by subscription ID
        const { data: profile, error: findError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (findError || !profile) {
          logError("Profile not found for subscription", { 
            subscriptionId: subscription.id,
            error: findError?.message 
          });
          break;
        }

        // Downgrade to free plan
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            plan: 'creator',
            billing_cycle: null,
            subscription_status: 'canceled',
            is_pro: false,
            delinquent: false,
            grace_period_end: null,
            current_period_end: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          logError("Failed to downgrade profile", { userId: profile.id, error: updateError.message });
        } else {
          logStep("Profile downgraded to creator", { userId: profile.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logError("Webhook processing failed", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Still return 200 to prevent Stripe from retrying on our errors
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
});
