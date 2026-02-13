import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    let event;

    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
    } catch (err: any) {
        return new Response(`Webhook Signature Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { company_id, plan, user_id } = session.metadata || {};

        if (company_id) {
            // Calculate Access Period (1 Year)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            // Upsert Subscription
            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    company_id: company_id,
                    plan_id: plan || 'pro_annual',
                    status: 'active',
                    current_period_start: startDate.toISOString(),
                    current_period_end: endDate.toISOString(),
                    currency: 'USD',
                    amount_paid: session.amount_total ? session.amount_total / 100 : 0,
                    payment_gateway: 'stripe',
                    stripe_subscription_id: session.payment_intent as string // Using PaymentIntent ID as ref for one-time
                }, { onConflict: 'company_id' });

            if (error) {
                console.error('Database Update Failed:', error);
                return new Response("Database Update Failed", { status: 500 });
            }
        }
    }

    return new Response("Received", { status: 200 });
});
