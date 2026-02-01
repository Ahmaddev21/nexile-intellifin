import React from 'react';
import { ProjectHealthScore as HealthScoreType } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ProjectHealthScoreProps {
    healthScore: HealthScoreType;
}

const ProjectHealthScore: React.FC<ProjectHealthScoreProps> = ({ healthScore }) => {
    const { score, rating, factors } = healthScore;

    const getColor = () => {
        if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500' };
        if (score >= 60) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-500' };
        if (score >= 40) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' };
        if (score >= 20) return { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500' };
        return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500' };
    };

    const colors = getColor();
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    Project Health Score
                </h3>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${colors.text} bg-opacity-10`}>
                    {rating}
                </span>
            </div>

            <div className="flex items-center gap-6">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-slate-200 dark:text-slate-700"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={colors.text}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">/ 100</div>
                        </div>
                    </div>
                </div>

                {/* Factor Breakdown */}
                <div className="flex-1 space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Profit Margin</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{factors.profitMargin}/100</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${colors.bg}`} style={{ width: `${factors.profitMargin}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cost Control</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{factors.costControl}/100</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${colors.bg}`} style={{ width: `${factors.costControl}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Trend</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{factors.trend}/100</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${colors.bg}`} style={{ width: `${factors.trend}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectHealthScore;
