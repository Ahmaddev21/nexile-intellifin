-- ============================================
-- BULLETPROOF: Force active subscription for EVERY company
-- ============================================

-- First: Delete any broken/null subscription rows
DELETE FROM subscriptions WHERE status IS NULL;

-- Then: Insert fresh active subscriptions for ALL companies
INSERT INTO subscriptions (
    company_id, plan_id, status,
    current_period_start, current_period_end,
    currency, amount_paid, payment_gateway
)
SELECT 
    id, 'pro_annual', 'active',
    NOW(), NOW() + INTERVAL '1 year',
    'USD', 0, 'stripe'
FROM companies
ON CONFLICT (company_id) 
DO UPDATE SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 year';

-- Verify: Every company should now show 'active'
SELECT c.name as company, s.status, s.current_period_end
FROM companies c
LEFT JOIN subscriptions s ON s.company_id = c.id
ORDER BY c.created_at DESC;
