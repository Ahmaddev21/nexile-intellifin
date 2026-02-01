
const TOKENS = (process.env.GITHUB_TOKENS || '').split(',').filter(Boolean);

async function test() {
    const endpoint = "https://models.inference.ai.azure.com/chat/completions";
    const payload = {
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello." }
        ],
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 100
    };

    for (const token of TOKENS) {
        console.log(`Testing token: ${token.substring(0, 15)}...`);
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                console.error(`Error (${response.status}):`, error);
            } else {
                const result = await response.json();
                console.log("Success:", result.choices[0].message.content);
            }
        } catch (error) {
            console.error("Fetch Error:", error.message);
        }
        console.log("---");
    }
}

test();
