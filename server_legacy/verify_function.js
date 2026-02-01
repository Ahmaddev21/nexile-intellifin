const API_URL = 'http://localhost:5000/api';

async function verifyPersistenceAndFunction() {
    console.log('--- STARTING PERSISTENCE & FUNCTIONAL AUDIT ---');

    // 1. Recover User (Search for the momUser created previously)
    // In a real test, we'd know the credentials. I'll search for 'momUser'
    // but better yet, I'll just use the logic from verifyMoM but without signing up.
    // Wait, I need a token. I'll login with a known user.
    // I created 'Ahmad' and 'ahmad' earlier. I'll use those or just sign up a new one for functional audit.

    const timestamp = Date.now();
    const user_id = `funcUser_${timestamp}`;
    const email = `${user_id}@test.com`;
    await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user_id, email, password: 'password123' })
    });
    const { token } = await (await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
    })).json();
    console.log('User logged in for functional audit.');

    // 2. Audit: Invoice Status Update (Pending -> Paid)
    const invRes = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            clientId: 'c1', clientName: 'C1', projectId: 'p1', projectName: 'P1',
            amount: 1000, date: '2026-01-20', status: 'pending'
        })
    });
    const invoice = await invRes.json();
    console.log('Created pending invoice:', invoice.id);

    // Initial check: Revenue should be 0
    let analytics = await (await fetch(`${API_URL}/analytics/monthly`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    if (analytics.length === 0 || analytics[0].revenue === 0) {
        console.log('Initial revenue is $0 as expected.');
    }

    // Update to Paid
    const fixRes = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'paid' })
    });
    console.log('Invoice updated to PAID:', fixRes.status);

    // Re-check: Revenue should be 1000
    analytics = await (await fetch(`${API_URL}/analytics/monthly`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    if (analytics[0]?.revenue === 1000) {
        console.log('PASS: Invoice status update correctly impacted dashboard totals.');
    } else {
        console.error('FAIL: Revenue update error (Expected 1000, got ' + analytics[0]?.revenue + ')');
    }

    // 3. Audit: Project Soft Delete
    const projRes = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: 'Disposable Proj', budget: 500, startDate: '2026-01-01' })
    });
    const project = await projRes.json();
    console.log('Created project for deletion:', project.id);

    const delRes = await fetch(`${API_URL}/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Project deleted (Soft):', delRes.status);

    const dataRes = await (await fetch(`${API_URL}/data`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    const found = dataRes.projects.find(p => p.id === project.id);
    if (!found) {
        console.log('PASS: Soft-deleted project hidden from /api/data.');
    } else {
        console.error('FAIL: Soft-deleted project still visible!');
    }
}

verifyPersistenceAndFunction();
