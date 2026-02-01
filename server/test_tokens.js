require('dotenv').config();
const fetch = require('node-fetch');

console.log('=== Testing GitHub Models API Tokens ===\n');

const tokens = [
    { name: 'Token 1', value: process.env.GITHUB_TOKEN_1 },
    { name: 'Token 2', value: process.env.GITHUB_TOKEN_2 },
    { name: 'Token 3', value: process.env.GITHUB_TOKEN_3 }
];

async function testToken(name, token) {
    if (!token) {
        console.log(`${name}: NOT FOUND IN ENV\n`);
        return;
    }

    console.log(`${name}: ${token.substring(0, 25)}...`);

    try {
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: 'Say hello in 5 words' }],
                max_tokens: 50
            })
        });

        console.log(`  Status: ${response.status} ${response.statusText}`);

        if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const data = await response.json().catch(() => ({}));
            console.log(`  ⚠️  RATE LIMITED`);
            console.log(`  Retry after: ${retryAfter || 'unknown'}`);
            console.log(`  Message: ${data.message || data.error || 'No message'}`);
        } else if (response.status === 200) {
            const data = await response.json();
            console.log(`  ✅ SUCCESS`);
            console.log(`  Response: ${data.choices[0].message.content}`);
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`  ❌ ERROR: ${JSON.stringify(errorData, null, 2)}`);
        }
    } catch (error) {
        console.log(`  ❌ EXCEPTION: ${error.message}`);
    }
    console.log('');
}

(async () => {
    for (const { name, value } of tokens) {
        await testToken(name, value);
    }
})();
