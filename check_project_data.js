// Quick script to check if invoices/expenses have project_id associations
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkProjectAssociations() {
    console.log('Checking project associations...\n');

    // Get current user (you'll need to be logged in)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('❌ No user logged in. Please log in first.');
        return;
    }

    console.log(`✅ Logged in as: ${user.email}\n`);

    // Check projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

    console.log(`📁 Projects: ${projects?.length || 0}`);
    projects?.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.id})`);
    });

    // Check invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id);

    console.log(`\n💰 Invoices: ${invoices?.length || 0}`);
    const invoicesWithProject = invoices?.filter(i => i.project_id) || [];
    const invoicesWithoutProject = invoices?.filter(i => !i.project_id) || [];

    console.log(`   ✅ With project_id: ${invoicesWithProject.length}`);
    invoicesWithProject.forEach(i => {
        console.log(`      - ${i.client_name}: $${i.amount} (Project: ${i.project_id}, Status: ${i.status})`);
    });

    console.log(`   ❌ Without project_id: ${invoicesWithoutProject.length}`);
    invoicesWithoutProject.forEach(i => {
        console.log(`      - ${i.client_name}: $${i.amount} (Status: ${i.status})`);
    });

    // Check expenses
    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id);

    console.log(`\n💸 Expenses: ${expenses?.length || 0}`);
    const expensesWithProject = expenses?.filter(e => e.project_id) || [];
    const expensesWithoutProject = expenses?.filter(e => !e.project_id) || [];

    console.log(`   ✅ With project_id: ${expensesWithProject.length}`);
    expensesWithProject.forEach(e => {
        console.log(`      - ${e.category}: $${e.amount} (Project: ${e.project_id}, Status: ${e.status})`);
    });

    console.log(`   ❌ Without project_id: ${expensesWithoutProject.length}`);
    expensesWithoutProject.forEach(e => {
        console.log(`      - ${e.category}: $${e.amount} (Status: ${e.status})`);
    });

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total transactions: ${(invoices?.length || 0) + (expenses?.length || 0)}`);
    console.log(`   Linked to projects: ${invoicesWithProject.length + expensesWithProject.length}`);
    console.log(`   Not linked: ${invoicesWithoutProject.length + expensesWithoutProject.length}`);

    if (invoicesWithoutProject.length > 0 || expensesWithoutProject.length > 0) {
        console.log('\n⚠️  WARNING: You have transactions without project associations!');
        console.log('   These were likely created before the bug fix.');
        console.log('   They won\'t show up in project financial calculations.');
    }
}

checkProjectAssociations().catch(console.error);
