import React, { useState } from 'react';
import { Users, Copy, RefreshCw, Shield, CheckCircle2 } from 'lucide-react';
import { Company } from '../types';
import { regenerateJoinCode } from '../services/api';

interface TeamSettingsProps {
    company: Company;
    onUpdate: () => void;
}

const TeamSettings: React.FC<TeamSettingsProps> = ({ company, onUpdate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (company.joinCode) {
            navigator.clipboard.writeText(company.joinCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm('Are you sure you want to regenerate the Team Code? The old code will stop working immediately.')) {
            return;
        }

        setIsLoading(true);
        try {
            await regenerateJoinCode();
            // Notify parent to refresh company data
            onUpdate();
            alert('New Team Code generated successfully!');
        } catch (error: any) {
            alert('Failed to regenerate code: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Team Settings</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage access and settings for your workspace.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Join Code Card */}
                <div className="glass-panel p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-32 h-32 text-indigo-600 dark:text-indigo-400 rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Access Code</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Share this code to invite members</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center mb-6">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Current Join Code</div>
                            <div className="text-4xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">
                                {company.joinCode || '------'}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleCopy}
                                disabled={!company.joinCode}
                                className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all shadow-lg dark:shadow-none ${company.joinCode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                            >
                                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </button>
                            <button
                                onClick={handleRegenerate}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold py-3 rounded-xl transition-all"
                            >
                                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                                {company.joinCode ? 'Regenerate' : 'Generate Code'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Workspace Info Card */}
                <div className="glass-panel p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Workspace Details</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Company Name</span>
                            <span className="font-bold text-slate-900 dark:text-white">{company.name}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Currency</span>
                            <span className="font-bold text-slate-900 dark:text-white">{company.currency}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Fiscal Year Start</span>
                            <span className="font-bold text-slate-900 dark:text-white">{company.fiscalYearStart}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamSettings;
