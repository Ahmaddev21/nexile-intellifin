import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    // This function is intended to be called by a Cron Job (e.g. every midnight)
    // or manually by an admin.

    try {
        const now = new Date().toISOString();

        // Find active subscriptions that have passed their end date
        const { data: expiredSubs, error: fetchError } = await supabase
            .from('subscriptions')
            .select('id, company_id, current_period_end')
            .eq('status', 'active')
            .lt('current_period_end', now);

        if (fetchError) throw fetchError;

        if (!expiredSubs || expiredSubs.length === 0) {
            return new Response(JSON.stringify({ message: "No expired subscriptions found" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${expiredSubs.length} subscriptions to expire.`);

        const idsToExpire = expiredSubs.map(sub => sub.id);

        // Bulk update status to 'expired'
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .in('id', idsToExpire);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
            message: `Successfully expired ${expiredSubs.length} subscriptions`,
            expired_ids: idsToExpire
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error in check-expiry:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
