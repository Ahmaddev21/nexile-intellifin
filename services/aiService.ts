
import { FinancialData, AIInsight, ProjectFinancialDetail, AIRecommendation } from '../types';

// Hardcoded tokens for client-side demo (User approved this trade-off)
// Hardcoded tokens removed for security. Use environment variables.
const TOKENS = (import.meta.env.VITE_GITHUB_TOKENS || '').split(',').filter(Boolean);

class MultiKeyAIClient {
    private currentKeyIndex = 0;
    private endpoint = "https://models.inference.ai.azure.com/chat/completions";
    private model = "gpt-4o";

    private rotateKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % TOKENS.length;
        console.log(`[AI Client] Rotated to token index ${this.currentKeyIndex}`);
    }

    private async request(payload: any): Promise<any> {
        const attempts = TOKENS.length;

        for (let i = 0; i < attempts; i++) {
            const token = TOKENS[this.currentKeyIndex];

            try {
                console.log(`[AI Request] Attempt ${i + 1}/${attempts}`);

                const response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...payload,
                        model: this.model
                    })
                });

                if (response.status === 429) {
                    console.warn(`[AI Request] Rate limit hit. Rotating...`);
                    this.rotateKey();
                    if (i === attempts - 1) throw new Error('All API tokens rate limited.');
                    continue;
                }

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || `API request failed with status ${response.status}`);
                }

                const data = await response.json();
                return data;

            } catch (error: any) {
                console.error(`[AI Request] Attempt ${i + 1} failed:`, error.message);
                if (i === attempts - 1) throw error;
                this.rotateKey();
            }
        }
    }

    async generateInsights(data: FinancialData, userQuery?: string): Promise<any> {
        console.log(`[AI Insights] Requesting ${userQuery ? 'chat response' : 'automated insights'}`);

        const systemPrompt = "You are NexileIntelliFin AI, a world-class AI CFO and financial advisor. Your goal is to analyze financial data and provide actionable strategic insights. Be professional, insightful, and always refer to yourself as NexileIntelliFin AI. If a JSON array is requested, return ONLY valid JSON.";

        const context = `
Data Summary:
Projects: ${JSON.stringify(data.projects?.map(p => ({ name: p.name, status: p.status, budget: p.budget })) || [])}
Revenue/Expenses: ${data.invoices?.length || 0} invoices, ${data.expenses?.length || 0} expenses
Total Revenue: ${data.invoices?.filter(i => i.status === 'paid').reduce((a: any, b: any) => a + b.amount, 0) || 0}
Total Expenses: ${data.expenses?.reduce((a: any, b: any) => a + b.amount, 0) || 0}
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

        try {
            const result = await this.request(payload);
            const content = result.choices[0].message.content;

            if (!userQuery) {
                try {
                    const jsonMatch = content.match(/\[[\s\S]*\]/);
                    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
                } catch (e) {
                    console.error("[AI Insights] Failed to parse JSON:", content);
                    return [];
                }
            }
            return content;
        } catch (error: any) {
            console.warn('[AI Insights] Failed:', error.message);
            return userQuery ? "I'm having trouble connecting to the AI service right now." : [];
        }
    }

    async generateProjectRecommendations(projectDetail: ProjectFinancialDetail): Promise<AIRecommendation[]> {
        console.log(`[AI Recommendations] Requesting recommendations`);

        const systemPrompt = "You are NexileIntelliFin AI, an expert project manager and financial analyst. Your goal is to analyze project financial details and provide actionable recommendations to improve profitability, efficiency, and delivery. Return ONLY valid JSON array.";

        const context = `
Project: ${projectDetail.project?.name}
Stats:
- Budget: $${projectDetail.budgetVsActual?.budget || 0}
- Actual Cost: $${projectDetail.budgetVsActual?.actual || 0}
- Variance: ${projectDetail.budgetVsActual?.variancePercent || 0}%
- Net Profit: $${projectDetail.netProfit || 0}
- Profit Margin: ${projectDetail.profitMargin || 0}%
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

        try {
            const result = await this.request(payload);
            const content = result.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (error: any) {
            console.warn('[AI Recommendations] Failed:', error.message);
            return [];
        }
    }
}

export const aiClient = new MultiKeyAIClient();
