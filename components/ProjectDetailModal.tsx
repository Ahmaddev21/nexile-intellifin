
import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Target, Calendar, Loader2 } from 'lucide-react';
import { ProjectFinancialDetail } from '../types';
import { fetchProjectDetail } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface ProjectDetailModalProps {
    projectId: string | null;
    isOpen: boolean;
    onClose: () => void;
    currencySymbol: string;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ projectId, isOpen, onClose, currencySymbol }) => {
    const [projectData, setProjectData] = useState<ProjectFinancialDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && projectId) {
            loadProjectData();
        }
    }, [isOpen, projectId]);

    const loadProjectData = async () => {
        if (!projectId) return;

        setIsLoading(true);
        try {
            const data = await fetchProjectDetail(projectId);
            setProjectData(data);

            // Generate AI insights based on project data
            generateInsights(data);
        } catch (error) {
            console.error('Failed to load project data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateInsights = (data: ProjectFinancialDetail) => {
        const insights: string[] = [];

        // Profitability insight
        if (data.profitMargin > 30) {
            insights.push(`${data.project.name} is highly profitable with a ${data.profitMargin.toFixed(1)}% margin. This is excellent performance.`);
        } else if (data.profitMargin < 10) {
            insights.push(`${data.project.name} has a low profit margin of ${data.profitMargin.toFixed(1)}%. Consider reviewing expenses to improve profitability.`);
        }

        // Budget variance insight
        if (data.budgetVsActual.variance < 0) {
            insights.push(`Project is over budget by ${currencySymbol}${Math.abs(data.budgetVsActual.variance).toLocaleString()} (${Math.abs(data.budgetVsActual.variancePercent).toFixed(1)}%). Review cost controls.`);
        } else if (data.budgetVsActual.variancePercent > 20) {
            insights.push(`Project is significantly under budget by ${data.budgetVsActual.variancePercent.toFixed(1)}%. Consider reallocating resources for maximum impact.`);
        }

        // Monthly trend insight
        if (data.monthlyBreakdown.length >= 2) {
            const lastMonth = data.monthlyBreakdown[data.monthlyBreakdown.length - 1];
            if (lastMonth.profitChange && lastMonth.profitChange < -10) {
                insights.push(`Profit declined by ${Math.abs(lastMonth.profitChange).toFixed(1)}% last month. Investigate recent cost increases or revenue drops.`);
            } else if (lastMonth.profitChange && lastMonth.profitChange > 15) {
                insights.push(`Strong profit growth of ${lastMonth.profitChange.toFixed(1)}% last month. Current strategies are working well.`);
            }
        }

        setAiInsights(insights);
    };

    const formatMonthDisplay = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 rounded-t-[3rem] flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
                            {isLoading ? 'Loading...' : projectData?.project.name}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {projectData && `Status: ${projectData.project.status.charAt(0).toUpperCase() + projectData.project.status.slice(1)}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : projectData ? (
                    <div className="p-6 space-y-6">
                        {/* Financial Summary Cards - 6 Card Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {/* Expected Revenue */}
                            <div className="glass-panel p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Expected Revenue</span>
                                </div>
                                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {currencySymbol}{projectData.expectedRevenue.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">All Invoices</div>
                            </div>

                            {/* Paid Revenue */}
                            <div className="glass-panel p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Paid Revenue</span>
                                </div>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {currencySymbol}{projectData.paidRevenue.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Received</div>
                            </div>

                            {/* Paid Expenses */}
                            <div className="glass-panel p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingDown className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Paid Expenses</span>
                                </div>
                                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                                    {currencySymbol}{projectData.paidOpExpenses.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Actual Costs</div>
                            </div>

                            {/* Outstanding Payables */}
                            <div className="glass-panel p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-amber-600" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Outstanding Payables</span>
                                </div>
                                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {currencySymbol}{projectData.outstandingPayables.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Unpaid Bills</div>
                            </div>

                            {/* Net Profit (Paid) */}
                            <div className="glass-panel p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Profit (Paid)</span>
                                </div>
                                <div className={`text-xl font-bold ${projectData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {projectData.netProfit >= 0 ? '+' : ''}{currencySymbol}{projectData.netProfit.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{projectData.profitMargin.toFixed(1)}% Margin</div>
                            </div>

                            {/* Total Liabilities */}
                            <div className="glass-panel p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Liabilities</span>
                                </div>
                                <div className="text-xl font-bold text-amber-700 dark:text-amber-500">
                                    {currencySymbol}{projectData.outstandingPayables.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Owed</div>
                            </div>
                        </div>

                        {/* Budget vs Actual */}
                        <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                Budget vs Actual
                            </h3>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Budget', value: projectData.budgetVsActual.budget },
                                        { name: 'Actual', value: projectData.budgetVsActual.actual }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                                        />
                                        <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                                            <Cell fill="#6366f1" />
                                            <Cell fill={projectData.budgetVsActual.variance >= 0 ? '#10b981' : '#f43f5e'} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Variance:</span>
                                <span className={`font-bold ${projectData.budgetVsActual.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {projectData.budgetVsActual.variance >= 0 ? '+' : ''}{currencySymbol}{projectData.budgetVsActual.variance.toLocaleString()} ({projectData.budgetVsActual.variancePercent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>

                        {/* Monthly Timeline */}
                        <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Monthly Profit Timeline</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectData.monthlyBreakdown.map(m => ({
                                        month: formatMonthDisplay(m.month),
                                        profit: m.netProfit,
                                        revenue: m.revenue,
                                        expenses: m.expenses
                                    }))}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* AI Insights */}
                        {aiInsights.length > 0 && (
                            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">AI Project Insights</h3>
                                <div className="space-y-3">
                                    {aiInsights.map((insight, idx) => (
                                        <div key={idx} className="flex gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProjectDetailModal;
