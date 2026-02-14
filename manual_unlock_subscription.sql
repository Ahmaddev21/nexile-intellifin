-- ============================================
-- MANUAL SUBSCRIPTION UNLOCK FOR TESTING
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This will activate a 1-year test subscription for your company.

-- Step 1: Find your company (shows all companies so you can verify)
SELECT id, name, user_id, join_code FROM companies;

-- Step 2: Insert/Update a test subscription
-- Replace 'YOUR_COMPANY_ID' with the actual ID from Step 1
-- Or use this auto-detect version that finds the first company:

INSERT INTO subscriptions (
    company_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    currency,
    amount_paid,
    payment_gateway
)
SELECT 
    id,
    'pro_annual',
    'active',
    NOW(),
    NOW() + INTERVAL '1 year',
    'USD',
    0,
    'stripe'
FROM companies
LIMIT 1
ON CONFLICT (company_id) 
DO UPDATE SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 year',
    plan_id = 'pro_annual';

-- Step 3: Verify it worked
SELECT s.*, c.name as company_name 
FROM subscriptions s 
JOIN companies c ON c.id = s.company_id;
