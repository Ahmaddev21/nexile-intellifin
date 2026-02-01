import React, { useState } from 'react';
import { ScenarioResult } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

interface ScenarioSimulatorProps {
    currentRevenue: number;
    currentExpenses: number;
    currentProfit: number;
    currentMargin: number;
    currencySymbol: string;
}

const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
    currentRevenue,
    currentExpenses,
    currentProfit,
    currentMargin,
    currencySymbol
}) => {
    const [costAdjustment, setCostAdjustment] = useState(0);
    const [pricingAdjustment, setPricingAdjustment] = useState(0);

    const calculateScenario = (): ScenarioResult => {
        const adjustedRevenue = currentRevenue * (1 + pricingAdjustment / 100);
        const adjustedExpenses = currentExpenses * (1 + costAdjustment / 100);
        const projectedProfit = adjustedRevenue - adjustedExpenses;
        const newMargin = adjustedRevenue > 0 ? (projectedProfit / adjustedRevenue) * 100 : 0;

        return {
            originalProfit: currentProfit,
            projectedProfit,
            change: projectedProfit - currentProfit,
            changePercent: currentProfit !== 0 ? ((projectedProfit - currentProfit) / Math.abs(currentProfit)) * 100 : 0,
            newMargin,
            originalMargin: currentMargin
        };
    };

    const scenario = calculateScenario();
    const isPositive = scenario.change >= 0;

    return (
        <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Scenario Simulator
            </h3>

            <div className="space-y-6">
                {/* Cost Adjustment Slider */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Cost Adjustment
                        </label>
                        <span className={`text-sm font-bold ${costAdjustment > 0 ? 'text-rose-600 dark:text-rose-400' : costAdjustment < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {costAdjustment > 0 ? '+' : ''}{costAdjustment}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-50"
                        max="50"
                        value={costAdjustment}
                        onChange={(e) => setCostAdjustment(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>-50%</span>
                        <span>0%</span>
                        <span>+50%</span>
                    </div>
                </div>

                {/* Pricing Adjustment Slider */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Pricing Adjustment
                        </label>
                        <span className={`text-sm font-bold ${pricingAdjustment > 0 ? 'text-emerald-600 dark:text-emerald-400' : pricingAdjustment < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {pricingAdjustment > 0 ? '+' : ''}{pricingAdjustment}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-30"
                        max="30"
                        value={pricingAdjustment}
                        onChange={(e) => setPricingAdjustment(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>-30%</span>
                        <span>0%</span>
                        <span>+30%</span>
                    </div>
                </div>

                {/* Results */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Profit</span>
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                {currencySymbol}{currentProfit.toLocaleString()}
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Projected Profit</span>
                            </div>
                            <div className="text-xl font-bold text-indigo-900 dark:text-indigo-200">
                                {currencySymbol}{scenario.projectedProfit.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Impact</div>
                                <div className={`text-2xl font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {isPositive ? '+' : ''}{currencySymbol}{scenario.change.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New Margin</div>
                                <div className="flex items-center gap-2">
                                    {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {scenario.newMargin.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reset Button */}
                {(costAdjustment !== 0 || pricingAdjustment !== 0) && (
                    <button
                        onClick={() => {
                            setCostAdjustment(0);
                            setPricingAdjustment(0);
                        }}
                        className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                        Reset to Current
                    </button>
                )}
            </div>
        </div>
    );
};

export default ScenarioSimulator;
