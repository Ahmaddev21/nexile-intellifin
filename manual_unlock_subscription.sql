-- ============================================
-- UNLOCK SUBSCRIPTION FOR ALL COMPANIES
-- ============================================
-- Run this in Supabase SQL Editor

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
ON CONFLICT (company_id) 
DO UPDATE SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 year',
    plan_id = 'pro_annual';

-- Verify
SELECT s.status, s.current_period_end, c.name as company_name 
FROM subscriptions s 
JOIN companies c ON c.id = s.company_id;
