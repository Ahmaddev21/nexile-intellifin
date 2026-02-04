
export type FinancialStatus = 'paid' | 'sent' | 'overdue' | 'pending' | 'cancelled' | 'draft' | 'partially_credited' | 'fully_credited';
export type CreditNoteStatus = 'pending' | 'applied' | 'void';

export interface Company {
  name: string;
  industry: string;
  currency: string;
  fiscalYearStart: string;
}

export interface Invoice {
  id: string;
  customId?: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  amount: number;
  date: string;
  status: FinancialStatus;
}

export interface Expense {
  id: string;
  category: string;
  projectId: string;
  projectName: string;
  amount: number;
  date: string;
  type: 'fixed' | 'variable';
  status: 'paid' | 'pending' | 'cancelled';
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  budget: number;
  estimatedCost: number;
  expectedRevenue?: number;
  startDate: string;
  endDate?: string;
  costCategories?: string[];
  createdAt?: string;
  firstActivityDate?: string;
  lastActivityDate?: string;
  status: 'active' | 'completed' | 'on-hold' | 'archived';
}

export interface PayableInvoice {
  id: string;
  vendorName: string;
  projectId?: string;
  projectName?: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  projectId: string;
  amount: number;
  reason?: string;
  status: CreditNoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialData {
  invoices: Invoice[];
  expenses: Expense[];
  projects: Project[];
  payableInvoices: PayableInvoice[];
  creditNotes: CreditNote[];
}

export interface AIInsight {
  type: 'profit' | 'leak' | 'forecast' | 'efficiency';
  title: string;
  description: string;
  impact: string;
  score?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  color: string;
}

export interface UserProgress {
  points: number;
  level: number;
  badges: Badge[];
  nextLevelPoints: number;
  streaks?: number;
}

export interface MonthlyMetrics {
  month: string; // "2024-01"
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  revenueChange?: number; // percentage
  expensesChange?: number;
  profitChange?: number;
  marginChange?: number;
}

export interface ProjectFinancialDetail {
  project: Project;

  // Revenue metrics
  expectedRevenue: number;      // All invoices (not cancelled)
  paidRevenue: number;          // Only paid invoices

  // Expense metrics (Operational Only)
  totalOpExpenses: number;      // All OpEx (not cancelled)
  paidOpExpenses: number;       // Paid OpEx ONLY

  // Payable metrics (Liabilities)
  totalPayables: number;        // All Payables (not cancelled)
  paidPayables: number;         // Paid Payables only
  outstandingPayables: number;  // Unpaid Payables

  // Profit
  netProfit: number;            // Paid Rev - (Paid OpEx + Paid Payables)
  netProfitExpected: number;    // Exp Rev - (Total OpEx + Total Payables)
  profitMargin: number;

  // Projected (for planning)
  projectedRevenue: number;
  projectedExpenses: number;    // Total OpEx + Total Payables

  // Analysis
  monthlyBreakdown: MonthlyMetrics[];
  budgetVsActual: {
    budget: number;
    actual: number;             // Paid OpEx + Paid Payables
    variance: number;
    variancePercent: number;
  };
}

export type ComparisonPeriod = 'MoM' | 'QoQ' | 'YoY';

// Advanced AI Features Types

export interface ProjectHealthScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  factors: {
    profitMargin: number;
    costControl: number;
    trend: number;
  };
}

export interface EarlyWarning {
  severity: 'high' | 'medium' | 'low';
  type: 'margin_erosion' | 'budget_overrun' | 'revenue_shortfall' | 'negative_trend';
  message: string;
  recommendation: string;
}

export interface ScenarioResult {
  originalProfit: number;
  projectedProfit: number;
  change: number;
  changePercent: number;
  newMargin: number;
  originalMargin: number;
}

export interface AIRecommendation {
  type: 'cost_reduction' | 'pricing_adjustment' | 'timeline_optimization' | 'resource_allocation';
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AutoInsight {
  month: string;
  previousMonth: string;
  insight: string;
  metrics: {
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
  };
}

export interface ProjectCreate {
  name: string;
  client: string;
  budget: number;
  expectedRevenue: number;
  startDate: string;
  endDate?: string;
  costCategories: string[];
  status: 'active' | 'completed' | 'on-hold';
}
