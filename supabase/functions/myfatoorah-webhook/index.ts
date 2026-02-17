import { serve } from "http/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const _MYFATOORAH_SECRET_KEY = Deno.env.get("MYFATOORAH_WEBHOOK_SECRET");

serve(async (req) => {
    const _signature = req.headers.get("MyFatoorah-Signature");

    const body = await req.json();
    const { Event, Data } = body;

    if (Event === 'TransactionStatusChanged' && Data.TransactionStatus === 'Succss') {
        const { UserDefinedField } = Data;

        let metadata;
        try {
            metadata = JSON.parse(UserDefinedField);
        } catch (_e) {
            console.error('Failed to parse metadata');
            return new Response("Invalid metadata", { status: 400 });
        }

        if (!metadata || !metadata.company_id) {
            console.error('Missing company_id in metadata');
            return new Response("Missing company_id", { status: 400 });
        }

        // Calculate 1 year access period
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        const plan_type = metadata.plan_type || 'pro';

        // Handle add-on seat purchase
        if (plan_type === 'addon') {
            const { error } = await supabase
                .from('team_addons')
                .insert({
                    company_id: metadata.company_id,
                    additional_seats: 1,
                    status: 'active',
                    expires_at: endDate.toISOString(),
                    payment_gateway: 'myfatoorah',
                    payment_id: Data.InvoiceId?.toString(),
                });

            if (error) {
                console.error("team_addons insert failed:", error);
                return new Response("DB Error", { status: 500 });
            }

            return new Response("Addon Activated", { status: 200 });
        }

        // Handle subscription purchase (basic or pro)
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                company_id: metadata.company_id,
                plan_id: metadata.plan || `${plan_type}_annual`,
                plan_type: plan_type,
                status: 'active',
                current_period_start: startDate.toISOString(),
                current_period_end: endDate.toISOString(),
                currency: 'QAR',
                amount_paid: Data.InvoiceValue,
                payment_gateway: 'myfatoorah',
                myfatoorah_invoice_id: Data.InvoiceId?.toString(),
            }, { onConflict: 'company_id' });

        if (error) {
            console.error("DB Error", error);
            return new Response("DB Error", { status: 500 });
        }
    }

    return new Response("OK", { status: 200 });
});
