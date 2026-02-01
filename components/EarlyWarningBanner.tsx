import React from 'react';
import { EarlyWarning } from '../types';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface EarlyWarningBannerProps {
    warnings: EarlyWarning[];
    onDismiss?: (index: number) => void;
}

const EarlyWarningBanner: React.FC<EarlyWarningBannerProps> = ({ warnings, onDismiss }) => {
    if (warnings.length === 0) return null;

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'high': return <AlertTriangle className="w-5 h-5" />;
            case 'medium': return <AlertCircle className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    const getColors = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400';
            case 'medium': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400';
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400';
        }
    };

    return (
        <div className="space-y-3">
            {warnings.map((warning, index) => (
                <div
                    key={index}
                    className={`p-4 rounded-2xl border ${getColors(warning.severity)} animate-in slide-in-from-top-2 duration-300`}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            {getIcon(warning.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-bold text-sm mb-1">{warning.message}</p>
                                    <p className="text-xs opacity-90">{warning.recommendation}</p>
                                </div>
                                {onDismiss && (
                                    <button
                                        onClick={() => onDismiss(index)}
                                        className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EarlyWarningBanner;
