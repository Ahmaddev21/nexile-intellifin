// CRITICAL: Load environment variables FIRST
require('dotenv').config();

const fetch = require('node-fetch');

class AIService {
    constructor() {
        // Load tokens from environment (server-side only)
        this.tokens = [
            process.env.GITHUB_TOKEN_1,
            process.env.GITHUB_TOKEN_2,
            process.env.GITHUB_TOKEN_3
        ].filter(Boolean);

        this.currentKeyIndex = 0;
        this.endpoint = "https://models.inference.ai.azure.com/chat/completions";
        this.model = "gpt-4o";

        if (this.tokens.length === 0) {
            console.error("❌ CRITICAL ERROR: No API tokens configured!");
            console.error("Please check server/.env file and ensure GITHUB_TOKEN_1, GITHUB_TOKEN_2, GITHUB_TOKEN_3 are set.");
        } else {
            console.log(`✓ AI Service initialized with ${this.tokens.length} token(s)`);
        }
    }

    async request(payload) {
        if (this.tokens.length === 0) {
            throw new Error("AI configuration error: No API tokens available");
        }

        const attempts = this.tokens.length;

        for (let i = 0; i < attempts; i++) {
            const token = this.tokens[this.currentKeyIndex];

            try {
                console.log(`[AI Request] Attempt ${i + 1}/${attempts} using token index ${this.currentKeyIndex}`);

                const response = await fetch(this.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...payload,
                        model: this.model
                    })
                });

                // Handle rate limiting
                if (response.status === 429) {
                    console.warn(`[AI Request] Rate limit hit for token ${this.currentKeyIndex}. Rotating...`);
                    this.rotateKey();

                    // If this was the last attempt and all tokens are rate-limited
                    if (i === attempts - 1) {
                        throw new Error('All API tokens have exceeded their rate limits. Please try again later or add more tokens.');
                    }
                    continue;
                }

                // Handle other errors
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    console.error(`[AI Request] Failed with status ${response.status}:`, error);
                    throw new Error(error.message || `API request failed with status ${response.status}`);
                }

                // Parse successful response
                const data = await response.json();

                if (!data.choices || !data.choices[0]) {
                    console.error("[AI Request] Invalid response structure:", data);
                    throw new Error("Invalid AI response structure");
                }

                console.log(`[AI Request] ✓ Success with token index ${this.currentKeyIndex}`);
                return data;

            } catch (error) {
                console.error(`[AI Request] Attempt ${i + 1} failed:`, error.message);

                // If this was the last attempt, throw the error
                if (i === attempts - 1) {
                    throw error;
                }

                // Otherwise, rotate to next key and retry
                this.rotateKey();
            }
        }
    }

    rotateKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.tokens.length;
        console.log(`[AI Service] Rotated to token index ${this.currentKeyIndex}`);
    }

    async generateInsights(data, userQuery) {
        console.log(`[AI Insights] Generating ${userQuery ? 'chat response' : 'automated insights'}`);

        const systemPrompt = "You are NexileIntelliFin AI, a world-class AI CFO and financial advisor. Your goal is to analyze financial data and provide actionable strategic insights. Be professional, insightful, and always refer to yourself as NexileIntelliFin AI. If a JSON array is requested, return ONLY valid JSON.";

        const context = `
Data Summary:
Projects: ${JSON.stringify(data.projects?.map(p => ({ name: p.name, status: p.status, budget: p.budget })) || [])}
Revenue/Expenses: ${data.invoices?.length || 0} invoices, ${data.expenses?.length || 0} expenses
Total Revenue: ${data.invoices?.filter(i => i.status === 'paid').reduce((a, b) => a + b.amount, 0) || 0}
Total Expenses: ${data.expenses?.reduce((a, b) => a + b.amount, 0) || 0}
    `;

        const userPrompt = userQuery || "Analyze this financial data and provide 4 proactive insights formatted as a JSON array with 'type', 'title', 'description', and 'impact' fields. Focus on profit opportunities and cost risks.";

        const payload = {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `${context}\n\n${userPrompt}` }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        const result = await this.request(payload);
        const content = result.choices[0].message.content;

        // If no user query, parse as JSON array
        if (!userQuery) {
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                return JSON.parse(jsonMatch ? jsonMatch[0] : content);
            } catch (e) {
                console.error("[AI Insights] Failed to parse JSON response:", content);
                return [];
            }
        }

        // Return raw text for user queries
        return content;
    }

    async generateProjectRecommendations(projectDetail) {
        console.log(`[AI Recommendations] Generating for project: ${projectDetail.project?.name}`);

        const systemPrompt = "You are NexileIntelliFin AI, an expert project manager and financial analyst. Your goal is to analyze project financial details and provide actionable recommendations to improve profitability, efficiency, and delivery. Return ONLY valid JSON array.";

        const context = `
Project: ${projectDetail.project?.name}
Stats:
- Budget: $${projectDetail.budgetVsActual?.budget || 0}
- Actual Cost: $${projectDetail.budgetVsActual?.actual || 0}
- Variance: ${projectDetail.budgetVsActual?.variancePercent || 0}%
- Net Profit: $${projectDetail.netProfit || 0}
- Profit Margin: ${projectDetail.profitMargin || 0}%

Monthly Trends: ${JSON.stringify(projectDetail.monthlyBreakdown?.slice(-3) || [])}
    `;

        const userPrompt = "Analyze this project financial data and provide 3 specific recommendations formatted as a JSON array with 'type' (cost_reduction, pricing_adjustment, timeline_optimization, resource_allocation), 'title', 'description', 'impact', and 'priority' (high, medium, low).";

        const payload = {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `${context}\n\n${userPrompt}` }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        const result = await this.request(payload);
        const content = result.choices[0].message.content;

        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
            console.error("[AI Recommendations] Failed to parse JSON response:", content);
            return [];
        }
    }
}

module.exports = AIService;
