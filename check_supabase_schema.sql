-- Run this in Supabase SQL Editor to check actual schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name IN ('projects', 'invoices', 'expenses', 'payable_invoices', 'credit_notes')
ORDER BY 
    table_name, ordinal_position;
