
import React from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { ComparisonPeriod } from '../types';

interface MonthSelectorProps {
    selectedMonth: string;
    availableMonths: string[];
    comparisonPeriod: ComparisonPeriod;
    onMonthChange: (month: string) => void;
    onPeriodChange: (period: ComparisonPeriod) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
    selectedMonth,
    availableMonths,
    comparisonPeriod,
    onMonthChange,
    onPeriodChange
}) => {
    const formatMonthDisplay = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <select
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                >
                    {availableMonths.map(month => (
                        <option key={month} value={month}>
                            {formatMonthDisplay(month)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    {(['MoM', 'QoQ', 'YoY'] as ComparisonPeriod[]).map(period => (
                        <button
                            key={period}
                            onClick={() => onPeriodChange(period)}
                            className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${comparisonPeriod === period
                                    ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-xs text-slate-400 dark:text-slate-500">
                {comparisonPeriod === 'MoM' && 'Month-over-Month'}
                {comparisonPeriod === 'QoQ' && 'Quarter-over-Quarter'}
                {comparisonPeriod === 'YoY' && 'Year-over-Year'}
            </div>
        </div>
    );
};

export default MonthSelector;
