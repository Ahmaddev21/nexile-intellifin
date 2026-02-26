const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTest() {
  try {
    // 1. Sign in or grab a session if we were to test it properly. 
    // Since we don't have a user context here simply via anon key, we'll just check if the function exists.
    
    // Test the RPC without auth - it might fail due to RLS, but if it says "function doesn't exist" that's bad.
    const { data, error } = await supabase.rpc('get_expense_summary', { 
         p_company_id: '123e4567-e89b-12d3-a456-426614174000' 
    });
    
    if (error && error.message.includes('Could not find the function')) {
      console.error('RPC function get_expense_summary not found!');
      process.exit(1);
    }
    
    console.log('RPC exists and responded (possibly with RLS error or empty data as expected):', error || data);
  } catch (err) {
    console.error(err);
  }
}
runTest();
