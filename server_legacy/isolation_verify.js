const API_URL = 'http://localhost:5000/api';

async function verifyIsolation() {
    console.log('--- STARTING ISOLATION VERIFICATION ---');

    // 1. Create User A
    const userA_id = `userA_${Date.now()}`;
    const userA_email = `${userA_id}@test.com`;
    const signupA = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userA_id, email: userA_email, password: 'password123' })
    });
    const { token: tokenA, user: userA } = await signupA.json();
    console.log('User A Created:', userA_id);

    // 2. Create User B
    const userB_id = `userB_${Date.now()}`;
    const userB_email = `${userB_id}@test.com`;
    const signupB = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userB_id, email: userB_email, password: 'password123' })
    });
    const { token: tokenB, user: userB } = await signupB.json();
    console.log('User B Created:', userB_id);

    // 3. User A creates a project
    const projectA = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
            name: 'Secret Project A',
            budget: 1000,
            startDate: '2024-01-01'
        })
    });
    const projectAData = await projectA.json();
    console.log('User A created project:', projectAData.id);

    // 4. User B creates a project
    const projectB = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
            name: 'Public Project B',
            budget: 500,
            startDate: '2024-01-01'
        })
    });
    const projectBData = await projectB.json();
    console.log('User B created project:', projectBData.id);

    // 5. TEST: Can User B see User A's project?
    const checkProjectsB = await fetch(`${API_URL}/data`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const { projects: projectsForB } = await checkProjectsB.json();
    const leakedA = projectsForB.find(p => p.id === projectAData.id);

    if (leakedA) {
        console.error('FAIL: User B can see User A\'s project!');
    } else {
        console.log('PASS: User B cannot see User A\'s project via /api/data');
    }

    // 6. TEST: Can User B directly fetch User A's project?
    // Note: There isn't a direct GET /api/projects/:id for one project yet in index.js, 
    // but there is PATCH /api/projects/:id which we can try.
    const tryHackA = await fetch(`${API_URL}/projects/${projectAData.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ status: 'archived' })
    });

    if (tryHackA.status === 403 || tryHackA.status === 404) {
        console.log('PASS: User B blocked from modifying User A\'s project (Status:', tryHackA.status, ')');
    } else {
        console.error('FAIL: User B modified User A\'s project! (Status:', tryHackA.status, ')');
    }

    // 7. Test New Account Zeroed Metrics
    const userC_id = `userC_${Date.now()}`;
    const userC_email = `${userC_id}@test.com`;
    const signupC = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userC_id, email: userC_email, password: 'password123' })
    });
    const { token: tokenC } = await signupC.json();
    const dataC = await (await fetch(`${API_URL}/data`, { headers: { 'Authorization': `Bearer ${tokenC}` } })).json();

    if (dataC.projects.length === 0 && dataC.invoices.length === 0 && dataC.expenses.length === 0) {
        console.log('PASS: New account (User C) started with zeroed data.');
    } else {
        console.error('FAIL: New account has unexpected data:', dataC);
    }
}

verifyIsolation();
