
import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Wallet, BrainCircuit, Award } from 'lucide-react';
import { FinancialData, AIInsight, UserProgress, Company, MonthlyMetrics, ComparisonPeriod } from '../types';
import GamificationWidget from './GamificationWidget';
import MetricCard from './MetricCard';
import MonthSelector from './MonthSelector';
import { getMonthlyInsights } from '../services/geminiService';
import { calculateMonthlyMetrics } from '../utils/financialCalculations';
import RevenueBreakdownModal from './RevenueBreakdownModal';

interface DashboardProps {
  data: FinancialData;
  insights: AIInsight[];
  isLoadingInsights: boolean;
  progress: UserProgress;
  company?: Company;
  userName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ data, insights, isLoadingInsights, progress, company, userName }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyMetrics[]>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('MoM');
  const [monthlyInsightText, setMonthlyInsightText] = useState<string>('');
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const currencySymbol = useMemo(() => {
    switch (company?.currency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'QAR': return 'QR';
      default: return '$';
    }
  }, [company?.currency]);

  // Calculate monthly analytics from data prop
  useEffect(() => {
    calculateMonthlyData();
  }, [data]);

  const calculateMonthlyData = () => {
    const months = calculateMonthlyMetrics(
      data.invoices,
      data.expenses,
      data.payableInvoices || [],
      data.creditNotes || []
    );

    setMonthlyData(months);
    // Select the most recent month by default if not set
    if (months.length > 0 && selectedMonthIndex === 0) {
      setSelectedMonthIndex(months.length - 1);
    }
  };

  const generateMonthlyInsights = async () => {
    if (selectedMonthIndex === 0 || !monthlyData[selectedMonthIndex]) return;

    const currentMonth = monthlyData[selectedMonthIndex];
    const previousMonth = monthlyData[selectedMonthIndex - 1];

    try {
      const insightText = await getMonthlyInsights(currentMonth, previousMonth, data);
      setMonthlyInsightText(insightText);
    } catch (error) {
      console.error('Failed to generate monthly insights:', error);
    }
  };

  const currentMonth = monthlyData[selectedMonthIndex];
  const hasComparison = currentMonth && selectedMonthIndex > 0;

  // Calculate totals for display
  const totalRevenue = useMemo(() => {
    if (currentMonth?.revenue !== undefined) return currentMonth.revenue;
    const creditsByInvoice: Record<string, number> = {};
    (data.creditNotes || [])
      .filter(cn => cn.status === 'applied' && !!cn.invoiceId)
      .forEach(cn => {
        const id = cn.invoiceId as string;
        creditsByInvoice[id] = (creditsByInvoice[id] || 0) + cn.amount;
      });
    return data.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, inv) => {
        const credited = creditsByInvoice[inv.id] || 0;
        return sum + Math.max(inv.amount - credited, 0);
      }, 0);
  }, [currentMonth, data.invoices, data.creditNotes]);

  const totalExpenses = useMemo(() => {
    const expensesFromExp = data.expenses.filter(e => e.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const expensesFromPayables = (data.payableInvoices || []).filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

    return currentMonth?.expenses || (expensesFromExp + expensesFromPayables);
  }, [currentMonth, data.expenses, data.payableInvoices]);

  const netProfit = currentMonth?.netProfit || (totalRevenue - totalExpenses);
  const profitMargin = currentMonth?.profitMargin || (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0);

  const chartData = useMemo(() => {
    if (monthlyData.length > 0) {
      return monthlyData.map(m => ({
        name: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        revenue: m.revenue,
        expenses: m.expenses
      }));
    }
    return [];
  }, [monthlyData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Nexile Insight</h2>
          <p className="text-slate-500 dark:text-slate-400">Welcome back, {userName}. Every number tells a story.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 px-4 py-2 rounded-2xl flex items-center gap-3">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">Level {progress.level}</div>
              <div className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{progress.points} XP</div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Currency</span>
            <div className="font-bold text-lg text-slate-700 dark:text-slate-300">{company?.currency || 'USD'} ({currencySymbol})</div>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      {monthlyData.length > 0 && (
        <MonthSelector
          selectedMonth={monthlyData[selectedMonthIndex]?.month || ''}
          availableMonths={monthlyData.map(m => m.month)}
          comparisonPeriod={comparisonPeriod}
          onMonthChange={(month) => {
            const index = monthlyData.findIndex(m => m.month === month);
            if (index !== -1) setSelectedMonthIndex(index);
          }}
          onPeriodChange={setComparisonPeriod}
        />
      )}

      {/* Top Stats - High-Level Metrics Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`${currencySymbol}${totalRevenue.toLocaleString()}`}
          change={hasComparison ? currentMonth.revenueChange : undefined}
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
          tooltip="Total revenue from paid invoices. Higher revenue indicates strong sales performance."
          onClick={() => setShowRevenueModal(true)}
        />
        <MetricCard
          title="Expenses"
          value={`${currencySymbol}${totalExpenses.toLocaleString()}`}
          change={hasComparison ? currentMonth.expensesChange : undefined}
          icon={<TrendingDown className="w-6 h-6 text-rose-500" />}
          tooltip="Total business expenses. Lower expenses relative to revenue improve profitability."
        />
        <MetricCard
          title="Net Profit"
          value={`${currencySymbol}${netProfit.toLocaleString()}`}
          change={hasComparison ? currentMonth.profitChange : undefined}
          icon={<Wallet className="w-6 h-6 text-indigo-500" />}
          tooltip="Revenue minus expenses. This is your bottom line - the actual profit your business generates."
        />
        <MetricCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          change={hasComparison ? currentMonth.marginChange : undefined}
          icon={<Target className="w-6 h-6 text-amber-500" />}
          tooltip="Profit as a percentage of revenue. Shows how much profit you keep from each dollar earned. Higher is better."
        />
      </div>

      {/* Monthly AI Insights */}
      {hasComparison && monthlyInsightText && (
        <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Monthly Insights</h3>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{monthlyInsightText}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue vs Expenses Chart */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Revenue vs Expenses</h3>
              <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-lg px-3 py-1.5 outline-none text-slate-700 dark:text-slate-300 cursor-pointer">
                <option>Last 6 Months</option>
                <option>Year to Date</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Intelligence */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[280px] bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">AI Intelligence</h3>
            </div>
            <div className="space-y-4">
              {isLoadingInsights ? (
                <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-32 rounded-3xl"></div>
              ) : (
                insights.slice(0, 2).map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <GamificationWidget progress={progress} />
        </div>
      </div>
      <RevenueBreakdownModal
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        invoices={data.invoices}
        creditNotes={data.creditNotes || []}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => (
  <div className="group glass-panel p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40">
    <div className="flex justify-between items-start mb-1">
      <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${insight.type === 'profit' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
        insight.type === 'leak' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400' :
          insight.type === 'efficiency' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400'
        }`}>
        {insight.type}
      </span>
    </div>
    <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">{insight.title}</h4>
    <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-2 leading-tight">{insight.description}</p>
    <div className="flex items-center gap-2 text-[8px] font-semibold text-slate-400 uppercase tracking-widest">
      <div className="flex-1 h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 w-2/3"></div>
      </div>
      <span>{insight.impact}</span>
    </div>
  </div>
);

export default Dashboard;
