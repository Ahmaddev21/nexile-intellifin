-- =========================================================================================
-- MANUAL SUBSCRIPTION VERIFICATION SCRIPT
-- Purpose: Bypasses Stripe/MyFatoorah to grant immediate "Pro Annual" access to a company.
-- Usage:   Run this in the Supabase SQL Editor.
-- =========================================================================================

-- INSTRUCTIONS:
-- 1. Replace 'YOUR_COMPANY_ID_HERE' with your actual Company ID.
--    You can find this in the 'companies' table or in your browser URL when logged in.
-- 2. Run the script.

INSERT INTO public.subscriptions (
    company_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    currency,
    amount_paid,
    payment_gateway,
    created_at,
    updated_at
) VALUES (
    'YOUR_COMPANY_ID_HERE',  -- <--- REPLACE THIS (Keep the single quotes!)
    'pro_annual',
    'active',
    NOW(),
    NOW() + interval '1 year', -- Grants 1 year of access from today
    'USD',
    139.00,
    'manual',
    NOW(),
    NOW()
) 
ON CONFLICT (company_id) 
DO UPDATE SET 
    status = 'active',
    current_period_end = NOW() + interval '1 year',
    plan_id = 'pro_annual',
    updated_at = NOW();

-- VERIFICATION QUERY
-- After running the above, run this to confirm it worked:
-- SELECT * FROM public.subscriptions WHERE company_id = 'YOUR_COMPANY_ID_HERE';
