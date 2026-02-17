import { serve } from "http/server";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const MYFATOORAH_API_URL = "https://api.myfatoorah.com"; // Production only

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing configuration
const PRICING = {
    basic_annual: { qar: 499, usd: 13700, label: "Intellifin Basic Annual" }, // $137.00
    pro_annual:   { qar: 599, usd: 16500, label: "Intellifin Pro Annual" },   // $165.00
    addon_seat:   { qar: 99,  usd: 2700,  label: "Additional Team Seat" },    // $27.00
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { company_id, user_id, return_url, plan_type, currency } = await req.json();

        if (!company_id || !user_id) {
            throw new Error("Missing company_id or user_id");
        }

        if (!plan_type || !['basic', 'pro', 'addon'].includes(plan_type)) {
            throw new Error("Invalid plan_type. Must be 'basic', 'pro', or 'addon'");
        }

        // Map plan_type to pricing key
        const priceKey = plan_type === 'addon' ? 'addon_seat' : `${plan_type}_annual`;
        const pricing = PRICING[priceKey as keyof typeof PRICING];

        if (!pricing) {
            throw new Error("Invalid pricing configuration");
        }

        const planId = plan_type === 'addon' ? 'addon_seat' : `${plan_type}_annual`;

        // STRIPE (USD)
        if (currency === "USD") {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: pricing.label,
                                description: plan_type === 'addon'
                                    ? "Add 1 additional team member seat (annual)"
                                    : `1 Year License — ${plan_type === 'pro' ? 'Pro' : 'Basic'} Plan`,
                            },
                            unit_amount: pricing.usd,
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                success_url: `${return_url}?success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${return_url}?canceled=true`,
                client_reference_id: company_id,
                metadata: {
                    company_id,
                    user_id,
                    plan_type,
                    plan: planId,
                },
            });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // MYFATOORAH (QAR)
        if (currency === "QAR") {
            const token = Deno.env.get("MYFATOORAH_TOKEN");
            if (!token) throw new Error("MyFatoorah Token missing");

            const payload = {
                PaymentMethodId: 2,
                InvoiceValue: pricing.qar,
                DisplayCurrencyIso: "QAR",
                CallBackUrl: `${return_url}?success=true&gateway=myfatoorah`,
                ErrorUrl: `${return_url}?canceled=true&gateway=myfatoorah`,
                CustomerName: "Intellifin Customer",
                CustomerReference: company_id,
                UserDefinedField: JSON.stringify({ company_id, user_id, plan_type, plan: planId }),
            };

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

        throw new Error("Unsupported currency. Use 'USD' or 'QAR'.");

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
