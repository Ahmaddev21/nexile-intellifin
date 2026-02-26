-- Expense Summary RPC
-- This function gets the total amount of expenses grouped by category
-- Validates company_id to enforce RLS internally (though the user calling this will only be able to see their company's data if we use standard row level security, it's safer to explicitly pass company_id and check permissions if needed, or better, let the view/function run with invoker privileges so RLS applies to the underlying queries)

CREATE OR REPLACE FUNCTION get_expense_summary(
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    category TEXT,
    total_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY INVOKER -- IMPORTANT: Invoker security ensures RLS policies on the expenses table are enforced!
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.category::TEXT,
        SUM(e.amount)::NUMERIC as total_amount
    FROM public.expenses e
    WHERE e.company_id = p_company_id
      AND (p_start_date IS NULL OR e.date >= p_start_date)
      AND (p_end_date IS NULL OR e.date <= p_end_date)
    GROUP BY e.category
    ORDER BY total_amount DESC;
END;
$$;
