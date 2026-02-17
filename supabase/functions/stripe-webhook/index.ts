import { serve } from "http/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return new Response(`Webhook Signature Error: ${message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { company_id, plan_type, plan, user_id: _user_id } = session.metadata || {};

        if (!company_id) {
            console.error("Missing company_id in metadata");
            return new Response("Missing company_id", { status: 400 });
        }

        // Calculate 1 year access period
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Handle add-on seat purchase
        if (plan_type === 'addon') {
            const { error } = await supabase
                .from('team_addons')
                .insert({
                    company_id: company_id,
                    additional_seats: 1,
                    status: 'active',
                    expires_at: endDate.toISOString(),
                    payment_gateway: 'stripe',
                    payment_id: session.payment_intent as string,
                });

            if (error) {
                console.error('team_addons insert failed:', error);
                return new Response("Database Update Failed", { status: 500 });
            }

            return new Response("Addon Activated", { status: 200 });
        }

        // Handle subscription purchase (basic or pro)
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                company_id: company_id,
                plan_id: plan || `${plan_type}_annual`,
                plan_type: plan_type || 'pro',
                status: 'active',
                current_period_start: startDate.toISOString(),
                current_period_end: endDate.toISOString(),
                currency: 'USD',
                amount_paid: session.amount_total ? session.amount_total / 100 : 0,
                payment_gateway: 'stripe',
                stripe_subscription_id: session.payment_intent as string,
            }, { onConflict: 'company_id' });

        if (error) {
            console.error('Database Update Failed:', error);
            return new Response("Database Update Failed", { status: 500 });
        }
    }

    return new Response("Received", { status: 200 });
});
