const API_URL = 'http://localhost:5000/api';

async function verifyMoM() {
    console.log('--- STARTING MoM TREND VALIDATION ---');

    // 1. Setup User
    const user_id = `momUser_${Date.now()}`;
    const email = `${user_id}@test.com`;
    const signup = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user_id, email, password: 'password123' })
    });
    const { token } = await signup.json();

    // 2. Data for Previous Month (Dec 2025)
    await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            clientId: 'c1', clientName: 'C1', projectId: 'p1', projectName: 'P1',
            amount: 2000, date: '2025-12-15', status: 'paid'
        })
    });

    // 3. Data for Current Month (Jan 2026)
    await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            clientId: 'c1', clientName: 'C1', projectId: 'p1', projectName: 'P1',
            amount: 3000, date: '2026-01-15', status: 'paid'
        })
    });

    // 4. Verify Analytics
    const analyticsRes = await fetch(`${API_URL}/analytics/monthly`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const analytics = await analyticsRes.json();
    console.log('MoM Analytics:', JSON.stringify(analytics, null, 2));

    if (analytics.length < 2) {
        console.error('FAIL: Expected at least 2 months of data.');
        return;
    }

    const current = analytics.find(m => m.month === '2026-01');
    const previous = analytics.find(m => m.month === '2025-12');

    // Revenue Change: (3000 - 2000) / 2000 = 0.5 (50%)
    if (current.revenueChange === 50) {
        console.log('PASS: MoM Revenue Change correctly calculated (50%).');
    } else {
        console.error('FAIL: MoM Revenue Change error (Expected 50, got ' + current.revenueChange + ')');
    }
}

verifyMoM();
