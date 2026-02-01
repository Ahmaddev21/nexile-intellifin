
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change?: number; // percentage change
    icon: React.ReactNode;
    tooltip?: string;
    onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, tooltip, onClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasChange = change !== undefined && !isNaN(change);
    const isPositive = hasChange && change >= 0;
    const isNegative = hasChange && change < 0;

    // Determine color based on metric type and change direction
    const getChangeColor = () => {
        if (!hasChange) return '';

        // For expenses, negative is good (green), positive is bad (red)
        if (title.toLowerCase().includes('expense')) {
            return isNegative ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30';
        }

        // For revenue and profit, positive is good (green), negative is bad (red)
        return isPositive ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30';
    };

    return (
        <div
            className={`glass-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-all hover:shadow-md relative bg-white dark:bg-slate-900 ${onClick ? 'cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800' : ''}`}
            onClick={(e) => {
                // Only trigger main card action if we didn't click the expansion toggle
                if (!isExpanded && onClick) onClick();
            }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 shadow-sm rounded-2xl border border-slate-100 dark:border-slate-700">
                    {icon}
                </div>
                {hasChange && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getChangeColor()}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{change.toFixed(1)}%
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mb-1">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</div>
                {tooltip && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-300 hover:text-slate-500 dark:hover:text-slate-400'}`}
                        type="button"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="text-2xl font-bold text-slate-900 dark:text-white font-heading">{value}</div>

            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium mb-2">
                {hasChange ? 'vs last month' : 'First month - no comparison'}
            </div>

            {/* Expanded Details Section */}
            {isExpanded && tooltip && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {tooltip}
                    </p>
                    {onClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            View Details →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MetricCard;
