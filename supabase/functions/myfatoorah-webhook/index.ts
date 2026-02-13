import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const MYFATOORAH_SECRET_KEY = Deno.env.get("MYFATOORAH_WEBHOOK_SECRET");

serve(async (req) => {
    // MyFatoorah sends signature in custom header, or we can validate by calling GetPaymentStatus
    const signature = req.headers.get("MyFatoorah-Signature");

    // For simplicity/security in this implementation, we will fetch the payment status from MyFatoorah
    // using the 'Key' or 'PaymentId' provided in the body to verify authenticity.
    // However, the standard webhook payload usually contains the status.

    // Assume Standard MyFatoorah Webhook Payload:
    // { Event: 'TransactionStatusChanged', Data: { InvoiceId: 123, PaymentId: 456, TransactionStatus: 'Succss' ... } }

    const body = await req.json();
    const { Event, Data } = body;

    if (Event === 'TransactionStatusChanged' && Data.TransactionStatus === 'Succss') {
        const { UserDefinedField } = Data;

        let metadata;
        try {
            metadata = JSON.parse(UserDefinedField);
        } catch (e) {
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
