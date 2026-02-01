const API_URL = 'http://localhost:5000/api';

async function verifyLogic() {
    console.log('--- STARTING FINANCIAL LOGIC AUDIT ---');

    // 1. Setup User
    const user_id = `logicUser_${Date.now()}`;
    const email = `${user_id}@test.com`;
    const signup = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user_id, email, password: 'password123' })
    });
    const { token } = await signup.json();
    console.log('User setup complete.');

    // 2. Create Project
    const projRes = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: 'Calculated Project', budget: 10000, startDate: '2024-01-01' })
    });
    const project = await projRes.json();
    const projectId = project.id;

    // 3. Create Invoices (Paid vs Pending)
    // Paid Invoice $5000 (Current Month)
    await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            clientId: 'c1', clientName: 'Client 1',
            projectId, projectName: 'Calculated Project',
            amount: 5000, date: new Date().toISOString(),
            status: 'paid'
        })
    });

    // Pending Invoice $2000 (Should NOT count towards revenue)
    await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            clientId: 'c1', clientName: 'Client 1',
            projectId, projectName: 'Calculated Project',
            amount: 2000, date: new Date().toISOString(),
            status: 'pending'
        })
    });

    // 4. Create Expenses
    // Variable Expense $1000
    await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            category: 'Software', projectId, projectName: 'Calculated Project',
            amount: 1000, date: new Date().toISOString(), type: 'variable'
        })
    });

    // 5. Verify Dashboard Analytics
    const analyticsRes = await fetch(`${API_URL}/analytics/monthly`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const analytics = await analyticsRes.json();
    console.log('Monthly Analytics Raw:', JSON.stringify(analytics, null, 2));

    const currentMonth = analytics[analytics.length - 1];

    // Revenue check (only paid)
    if (currentMonth.revenue === 5000) {
        console.log('PASS: Revenue correctly counts only PAID invoices ($5000).');
    } else {
        console.error('FAIL: Revenue calculation error (Expected $5000, got $' + currentMonth.revenue + ')');
    }

    // Expense check
    if (currentMonth.expenses === 1000) {
        console.log('PASS: Expenses correctly summed ($1000).');
    } else {
        console.error('FAIL: Expense calculation error (Expected $1000, got $' + currentMonth.expenses + ')');
    }

    // Profit check
    if (currentMonth.netProfit === 4000) {
        console.log('PASS: Net Profit correctly calculated (5000 - 1000 = 4000).');
    } else {
        console.error('FAIL: Profit calculation error (Expected 4000, got ' + currentMonth.netProfit + ')');
    }

    // Margin check (4000 / 5000 = 80%)
    if (currentMonth.profitMargin === 80) {
        console.log('PASS: Profit Margin correctly calculated (80%).');
    } else {
        console.error('FAIL: Margin calculation error (Expected 80, got ' + currentMonth.profitMargin + ')');
    }

    // 6. Verify Project-Specific Analytics
    const projectDetailRes = await fetch(`${API_URL}/analytics/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const projectDetail = await projectDetailRes.json();
    console.log('Project Analytics Summary:', {
        totalRevenue: projectDetail.totalRevenue,
        totalExpenses: projectDetail.totalExpenses,
        netProfit: projectDetail.netProfit
    });

    if (projectDetail.totalRevenue === 5000 && projectDetail.totalExpenses === 1000) {
        console.log('PASS: Project-specific revenue and expenses correctly rolled up.');
    } else {
        console.error('FAIL: Project-specific roll-up error:', projectDetail);
    }
}

verifyLogic();
