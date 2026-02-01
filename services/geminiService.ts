import { FinancialData, AIInsight, ProjectFinancialDetail, ProjectHealthScore, EarlyWarning, AIRecommendation, AutoInsight } from '../types';
import { aiClient } from './aiService';

export const getFinancialInsights = async (data: FinancialData, userQuery?: string) => {
  return aiClient.generateInsights(data, userQuery);
};

export const getMonthlyInsights = async (currentMonth: any, previousMonth: any, data: FinancialData) => {
  const context = `
    CURRENT MONTH (${currentMonth.month}):
    Revenue: $${currentMonth.revenue}, Expenses: $${currentMonth.expenses}, Profit: $${currentMonth.netProfit}
    PREVIOUS MONTH (${previousMonth.month}):
    Revenue: $${previousMonth.revenue}, Expenses: $${previousMonth.expenses}, Profit: $${previousMonth.netProfit}
  `;
  const query = `Provide 2 concise insights explaining the month-over-month changes based on this context: ${context}`;
  return aiClient.generateInsights(data, query);
};

// Calculate Project Health Score (Local Logic)
export const calculateHealthScore = (projectDetail: ProjectFinancialDetail): ProjectHealthScore => {
  const { profitMargin, budgetVsActual, monthlyBreakdown } = projectDetail;

  // Profit Margin Factor (40%)
  const marginScore = Math.min(100, Math.max(0, (profitMargin / 30) * 100)) * 0.4;

  // Cost Control Factor (30%)
  const budgetVariance = budgetVsActual.variancePercent / 100;
  const costScore = budgetVariance >= 0
    ? Math.min(100, 100 + (budgetVariance * 50)) * 0.3
    : Math.max(0, 100 + (budgetVariance * 100)) * 0.3;

  // Trend Factor (30%)
  let trendScore = 50; // Default neutral
  if (monthlyBreakdown.length >= 2) {
    const recentMonths = monthlyBreakdown.slice(-3);
    const avgChange = recentMonths.reduce((sum, m) => sum + (m.profitChange || 0), 0) / recentMonths.length;
    trendScore = Math.min(100, Math.max(0, 50 + (avgChange * 2))) * 0.3;
  } else {
    trendScore = 50 * 0.3;
  }

  const score = Math.round(marginScore + costScore + trendScore);

  let rating: ProjectHealthScore['rating'];
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  else if (score >= 20) rating = 'Poor';
  else rating = 'Critical';

  return {
    score,
    rating,
    factors: {
      profitMargin: Math.round(marginScore / 0.4),
      costControl: Math.round(costScore / 0.3),
      trend: Math.round(trendScore / 0.3)
    }
  };
};

// Generate Early Warnings (Local Logic)
export const generateEarlyWarnings = (projectDetail: ProjectFinancialDetail): EarlyWarning[] => {
  const warnings: EarlyWarning[] = [];
  const { profitMargin, budgetVsActual, monthlyBreakdown, netProfit } = projectDetail;

  // Check for margin erosion
  if (monthlyBreakdown.length >= 2) {
    const recentMonths = monthlyBreakdown.slice(-2);
    const marginChange = recentMonths[1].profitMargin - recentMonths[0].profitMargin;

    if (marginChange < -5) {
      warnings.push({
        severity: 'high',
        type: 'margin_erosion',
        message: `Profit margin declined by ${Math.abs(marginChange).toFixed(1)}% last month`,
        recommendation: 'Review recent cost increases and consider pricing adjustments'
      });
    }
  }

  // Check for budget overrun
  if (budgetVsActual.variance < 0) {
    const overrunPercent = Math.abs(budgetVsActual.variancePercent);
    warnings.push({
      severity: overrunPercent > 20 ? 'high' : overrunPercent > 10 ? 'medium' : 'low',
      type: 'budget_overrun',
      message: `Project is ${overrunPercent.toFixed(1)}% over budget`,
      recommendation: 'Implement cost controls and review expense categories'
    });
  }

  // Check for negative profit
  if (netProfit < 0) {
    warnings.push({
      severity: 'high',
      type: 'revenue_shortfall',
      message: 'Project is currently operating at a loss',
      recommendation: 'Increase revenue through pricing or reduce operational costs'
    });
  }

  // Check for negative trend
  if (monthlyBreakdown.length >= 3) {
    const recentMonths = monthlyBreakdown.slice(-3);
    const negativeMonths = recentMonths.filter(m => (m.profitChange || 0) < 0).length;

    if (negativeMonths >= 2) {
      warnings.push({
        severity: 'medium',
        type: 'negative_trend',
        message: 'Profit declining for multiple consecutive months',
        recommendation: 'Analyze cost drivers and revenue patterns to reverse the trend'
      });
    }
  }

  return warnings;
};

// Generate AI Recommendations (Delegated to Multi-Key Service)
export const generateProjectRecommendations = async (projectDetail: ProjectFinancialDetail): Promise<AIRecommendation[]> => {
  return aiClient.generateProjectRecommendations(projectDetail);
};

// Generate Auto-Insights Timeline (Local Logic)
export const generateAutoInsights = (monthlyBreakdown: any[]): AutoInsight[] => {
  const insights: AutoInsight[] = [];

  for (let i = 1; i < monthlyBreakdown.length; i++) {
    const current = monthlyBreakdown[i];
    const previous = monthlyBreakdown[i - 1];

    const revenueChange = current.revenueChange || 0;
    const expenseChange = current.expensesChange || 0;
    const profitChange = current.profitChange || 0;

    let insight = '';

    if (Math.abs(profitChange) < 5) {
      insight = 'Profit remained relatively stable with minimal changes in revenue and expenses.';
    } else if (profitChange > 0) {
      if (revenueChange > expenseChange) {
        insight = `Profit increased by ${profitChange.toFixed(1)}% primarily due to ${revenueChange.toFixed(1)}% revenue growth outpacing ${expenseChange.toFixed(1)}% expense increase.`;
      } else {
        insight = `Profit improved by ${profitChange.toFixed(1)}% thanks to ${Math.abs(expenseChange).toFixed(1)}% reduction in expenses.`;
      }
    } else {
      if (expenseChange > revenueChange) {
        insight = `Profit declined by ${Math.abs(profitChange).toFixed(1)}% as expenses increased ${expenseChange.toFixed(1)}% while revenue only grew ${revenueChange.toFixed(1)}%.`;
      } else {
        insight = `Profit decreased by ${Math.abs(profitChange).toFixed(1)}% due to ${Math.abs(revenueChange).toFixed(1)}% revenue decline.`;
      }
    }

    insights.push({
      month: current.month,
      previousMonth: previous.month,
      insight,
      metrics: {
        revenueChange,
        expenseChange,
        profitChange
      }
    });
  }

  return insights;
};
