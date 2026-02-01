import { FinancialData, MonthlyMetrics, Project, Invoice, Expense, PayableInvoice, CreditNote, ProjectFinancialDetail } from '../types';

export const calculateMonthlyMetrics = (
    invoices: Invoice[],
    expenses: Expense[],
    payableInvoices: PayableInvoice[] = [],
    creditNotes: CreditNote[] = []
): MonthlyMetrics[] => {
    // Generate last 6 months buckets
    const today = new Date();
    const months: MonthlyMetrics[] = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({
            month: monthStr,
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            profitMargin: 0,
            revenueChange: 0,
            expensesChange: 0,
            profitChange: 0,
            marginChange: 0
        });
    }

    // Precompute credits per invoice (applied only)
    const creditsByInvoice: Record<string, number> = {};
    creditNotes.forEach(cn => {
        if (cn.status === 'applied' && cn.invoiceId) {
            creditsByInvoice[cn.invoiceId] = (creditsByInvoice[cn.invoiceId] || 0) + cn.amount;
        }
    });

    // Aggregate revenue per invoice minus its credits (only when invoice is paid)
    invoices.forEach(inv => {
        if (inv.status === 'paid') {
            const monthStr = inv.date.substring(0, 7);
            const monthMetric = months.find(m => m.month === monthStr);
            if (monthMetric) {
                const credited = creditsByInvoice[inv.id] || 0;
                monthMetric.revenue += Math.max(inv.amount - credited, 0);
            }
        }
    });

    expenses.forEach(exp => {
        if (exp.status === 'paid') {
            const monthStr = exp.date.substring(0, 7);
            const monthMetric = months.find(m => m.month === monthStr);
            if (monthMetric) {
                monthMetric.expenses += exp.amount;
            }
        }
    });

    // Add Payable Invoices to Expenses (Unified Logic)
    // Payables affect profit ONLY when they are PAID and converted to actual expenses.
    payableInvoices.forEach(pay => {
        if (pay.status === 'paid') {
            const monthStr = pay.date.substring(0, 7);
            const monthMetric = months.find(m => m.month === monthStr);
            if (monthMetric) {
                monthMetric.expenses += pay.amount;
            }
        }
    });

    // Note: Do not subtract credit notes globally; they are already applied per invoice above.

    // Calculate derived metrics
    months.forEach((m, index) => {
        m.netProfit = m.revenue - m.expenses;
        m.profitMargin = m.revenue > 0 ? (m.netProfit / m.revenue) * 100 : 0;

        // Comparisons
        if (index > 0) {
            const prev = months[index - 1];
            m.revenueChange = prev.revenue > 0 ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : 0;
            m.expensesChange = prev.expenses > 0 ? ((m.expenses - prev.expenses) / prev.expenses) * 100 : 0;
            m.profitChange = prev.netProfit !== 0 ? ((m.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100 : 0;
            m.marginChange = m.profitMargin - prev.profitMargin;
        }
    });

    return months;
};

export const calculateProjectFinancials = (
    project: Project,
    invoices: Invoice[],
    expenses: Expense[],
    payableInvoices: PayableInvoice[] = [],
    creditNotes: CreditNote[] = []
): ProjectFinancialDetail => {
    // Filter items for this project
    const projectInvoices = invoices.filter(i => i.projectId === project.id);
    const projectExpenses = expenses.filter(e => e.projectId === project.id);
    const projectPayables = payableInvoices.filter(p => p.projectId === project.id);
    const projectCredits = creditNotes.filter(cn => cn.projectId === project.id && cn.status === 'applied');

    // Precompute credits by invoice
    const creditsByInvoice: Record<string, number> = {};
    projectCredits
        .filter(cn => !!cn.invoiceId)
        .forEach(cn => {
            creditsByInvoice[cn.invoiceId!] = (creditsByInvoice[cn.invoiceId!] || 0) + cn.amount;
        });

    // ===== REVENUE METRICS =====

    // Expected Revenue: All invoices (not cancelled) minus credits
    const expectedRevenue = projectInvoices
        .filter(i => i.status !== 'cancelled')
        .reduce((sum, item) => {
            const credited = creditsByInvoice[item.id] || 0;
            return sum + Math.max(item.amount - credited, 0);
        }, 0);

    // Paid Revenue: Only paid invoices minus credits
    const paidRevenue = projectInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, item) => {
            const credited = creditsByInvoice[item.id] || 0;
            return sum + Math.max(item.amount - credited, 0);
        }, 0);

    // ===== EXPENSE METRICS (OPERATIONAL) =====

    // Total Operational Expenses: All expenses (not cancelled)
    const totalOpExpenses = projectExpenses
        .filter(e => e.status !== 'cancelled')
        .reduce((sum, item) => sum + item.amount, 0);

    // Paid Operational Expenses: ONLY actual paid expenses
    const paidOpExpenses = projectExpenses
        .filter(e => e.status === 'paid')
        .reduce((sum, item) => sum + item.amount, 0);

    // ===== PAYABLE METRICS (LIABILITIES) =====

    // Total Payables: All payables (not cancelled)
    const totalPayables = projectPayables
        .filter(p => p.status !== 'cancelled')
        .reduce((sum, item) => sum + item.amount, 0);

    // Outstanding Payables: Unpaid bills (liabilities)
    const outstandingPayables = projectPayables
        .filter(p => p.status !== 'paid' && p.status !== 'cancelled')
        .reduce((sum, item) => sum + item.amount, 0);

    // Paid Payables: Historical paid bills
    const paidPayables = projectPayables
        .filter(p => p.status === 'paid')
        .reduce((sum, item) => sum + item.amount, 0);

    // Total Actual Cash Outflow = Paid OpEx + Paid Payables
    const totalCashOutflow = paidOpExpenses + paidPayables;

    // Total Expected Outflow = Total OpEx + Total Payables
    const totalExpectedOutflow = totalOpExpenses + totalPayables;

    // ===== PROFIT CALCULATION =====

    // Net Profit (Paid) = Paid Revenue - (Paid OpEx + Paid Payables)
    const netProfit = paidRevenue - totalCashOutflow;

    // Net Profit (Expected) = Expected Revenue - (Total OpEx + Total Payables)
    const netProfitExpected = expectedRevenue - totalExpectedOutflow;

    const profitMargin = paidRevenue > 0 ? (netProfit / paidRevenue) * 100 : 0;

    // ===== PROJECTED METRICS (for planning) =====

    const projectedRevenue = expectedRevenue;
    const projectedExpenses = totalExpectedOutflow;

    // ===== BUDGET VARIANCE =====
    // Budget variance compares budget to Total Cash Outflow
    const variance = project.budget - totalCashOutflow;
    const variancePercent = project.budget > 0 ? (variance / project.budget) * 100 : 0;

    // ===== MONTHLY BREAKDOWN =====
    const monthlyBreakdown = calculateMonthlyMetrics(projectInvoices, projectExpenses, projectPayables, projectCredits);

    return {
        project,

        // Revenue metrics
        expectedRevenue,
        paidRevenue,

        // Expense metrics (Operational)
        totalOpExpenses,
        paidOpExpenses,

        // Payable metrics (Liabilities)
        totalPayables,
        outstandingPayables,
        paidPayables,

        // Profit
        netProfit,
        netProfitExpected,
        profitMargin,

        // Projected
        projectedRevenue,
        projectedExpenses,

        // Analysis
        monthlyBreakdown,
        budgetVsActual: {
            budget: project.budget,
            actual: totalCashOutflow,
            variance,
            variancePercent
        }
    };
};
