import { serve } from "http/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const _MYFATOORAH_SECRET_KEY = Deno.env.get("MYFATOORAH_WEBHOOK_SECRET");

serve(async (req) => {
    // MyFatoorah sends signature in custom header, or we can validate by calling GetPaymentStatus
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
        }

        if (metadata && metadata.company_id) {
            // Calculate 1 Year
            const startDate = new Date();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    company_id: metadata.company_id,
                    plan_id: metadata.plan || 'pro_annual',
                    status: 'active',
                    current_period_start: startDate.toISOString(),
                    current_period_end: endDate.toISOString(),
                    currency: 'QAR',
                    amount_paid: Data.InvoiceValue,
                    payment_gateway: 'myfatoorah',
                    myfatoorah_invoice_id: Data.InvoiceId.toString()
                }, { onConflict: 'company_id' });

            if (error) {
                console.error("DB Error", error);
                return new Response("DB Error", { status: 500 });
            }
        }
    }

    return new Response("OK", { status: 200 });
});
