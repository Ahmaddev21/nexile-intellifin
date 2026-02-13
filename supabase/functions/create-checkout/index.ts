import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const MYFATOORAH_API_URL = Deno.env.get("MYFATOORAH_TEST_MODE") === "true"
    ? "https://apitest.myfatoorah.com"
    : "https://api.myfatoorah.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { price_id, _currency, company_id, user_id, return_url } = await req.json();

        if (!company_id || !user_id) {
            throw new Error("Missing company_id or user_id");
        }

        // STRIPE (USD)
        if (_currency === "USD") {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: "Intellifin Pro Annual",
                                description: "1 Year License for Intellifin Financial Suite",
                            },
                            unit_amount: 13900, // $139.00
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment", // Using payment mode for simplicity (can be 'subscription' if recurring)
                success_url: `${return_url}?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${return_url}?canceled=true`,
                client_reference_id: company_id,
                metadata: {
                    company_id,
                    user_id,
                    plan: "pro_annual"
                },
            });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // MYFATOORAH (QAR)
        if (_currency === "QAR") {
            const token = Deno.env.get("MYFATOORAH_TOKEN");
            if (!token) throw new Error("MyFatoorah Token missing");

            // ExecutePayment Payload
            const payload = {
                PaymentMethodId: 2, // Visa/MasterCard usually 2, depending on region config
                InvoiceValue: 499,
                DisplayCurrencyIso: "QAR",
                CallBackUrl: `${return_url}?success=true&gateway=myfatoorah`,
                ErrorUrl: `${return_url}?canceled=true&gateway=myfatoorah`,
                CustomerName: "Intellifin Customer", // In real app, fetch company name
                CustomerReference: company_id,
                UserDefinedField: JSON.stringify({ company_id, user_id, plan: 'pro_annual' }),
            };

            // In a real implementation, you might call 'InitiatePayment' first to get methods
            // For brevity, we assume 'ExecutePayment' directly if we know the method ID, or simple Payment Link generation
            // Let's use 'SendPayment' (Invoice Link) for simplest integration if ExecutePayment fails or is complex without methodId
            // Actually, 'ExecutePayment' is standard for direct integration.

            const resp = await fetch(`${MYFATOORAH_API_URL}/v2/ExecutePayment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await resp.json();

            if (!data.IsSuccess) {
                throw new Error(`MyFatoorah Error: ${data.Message}`);
            }

            return new Response(JSON.stringify({ url: data.Data.PaymentURL }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        throw new Error("Unsupported currency");

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
