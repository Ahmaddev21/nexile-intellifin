import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, Download } from 'lucide-react';
import { Expense } from '../types';
import { fetchFilteredExpenses, fetchExpenseSummary } from '../services/api';
import { downloadExpenseSummaryPDF } from '../utils/exportUtils';

interface ExpenseHistoryProps {
    companyName?: string;
}

const ExpenseHistory: React.FC<ExpenseHistoryProps> = ({ companyName = 'Company' }) => {
    // --- Expense Report State ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseSummary, setExpenseSummary] = useState<{ category: string, total_amount: number }[]>([]);
    const [isExpenseLoading, setIsExpenseLoading] = useState(false);
    const [expenseError, setExpenseError] = useState<string | null>(null);

    useEffect(() => {
        handleFilterExpenses();
    }, []);

    const handleFilterExpenses = async () => {
        setIsExpenseLoading(true);
        setExpenseError(null);
        try {
            const rangeStart = startDate || undefined;
            const rangeEnd = endDate || undefined;
            const fetchedExpenses = await fetchFilteredExpenses(rangeStart, rangeEnd);
            setExpenses(fetchedExpenses);

            const fetchedSummary = await fetchExpenseSummary(rangeStart, rangeEnd);
            setExpenseSummary(fetchedSummary);
        } catch (err: any) {
            setExpenseError(err.message || 'Failed to fetch expense report');
        } finally {
            setIsExpenseLoading(false);
        }
    };

    const handleDownloadSummary = () => {
        const dateRangeStr = `${startDate || 'Beginning'} to ${endDate || 'Now'}`;
        const generationDate = new Date().toISOString().split('T')[0];
        downloadExpenseSummaryPDF(
            companyName,
            dateRangeStr,
            generationDate,
            expenseSummary,
            grandTotal
        );
    };

    const grandTotal = useMemo(() => {
        return expenseSummary.reduce((sum, item) => sum + Number(item.total_amount), 0);
    }, [expenseSummary]);

    const formatDate = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Expense History</h2>
                    <p className="text-slate-500 dark:text-slate-400">Track, filter, and extract your historical expenses.</p>
                </div>
            </div>

            {/* Date Filters */}
            <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                    </div>
                    <button
                        onClick={handleFilterExpenses}
                        disabled={isExpenseLoading}
                        className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isExpenseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                        Apply Filter
                    </button>
                </div>
            </div>

            {expenseError && (
                <div className="p-4 bg-rose-100/50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
                    {expenseError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Category Summary</h3>
                            <button 
                                onClick={handleDownloadSummary}
                                disabled={expenseSummary.length === 0 || isExpenseLoading}
                                className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-50"
                                title="Download PDF Statement"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {isExpenseLoading ? (
                            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        ) : expenseSummary.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No Summary Available</div>
                        ) : (
                            <div className="space-y-4">
                                {expenseSummary.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{item.category}</span>
                                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                                            {Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                                
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 uppercase">Grand Total</span>
                                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                        {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filtered Expenses Details */}
                <div className="lg:col-span-2">
                     <div className="glass-panel rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filtered Expense Records</h3>
                        </div>
                        <div className="overflow-x-auto flex-1 p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">Date</th>
                                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">Category</th>
                                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-xs">Project</th>
                                        <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-xs">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {isExpenseLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" /></td>
                                        </tr>
                                    ) : expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No expenses found for this date range</td>
                                        </tr>
                                    ) : (
                                        expenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                                    {formatDate(expense.date)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-900 dark:text-white font-medium capitalize">
                                                    {expense.category}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                    {expense.projectName || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                                                    {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseHistory;
