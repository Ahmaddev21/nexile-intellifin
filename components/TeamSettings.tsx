import React, { useState, useRef, useEffect } from 'react';
import { Users, Copy, RefreshCw, Shield, CheckCircle2, ChevronDown, Calendar } from 'lucide-react';
import { Company } from '../types';
import { regenerateJoinCode, updateCompany } from '../services/api';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface TeamSettingsProps {
    company: Company;
    onUpdate: () => void;
    userRole: 'admin' | 'member';
}

const TeamSettings: React.FC<TeamSettingsProps> = ({ company, onUpdate, userRole }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    const [isSavingMonth, setIsSavingMonth] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setMonthDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            onUpdate();
            alert('New Team Code generated successfully!');
        } catch (error: any) {
            alert('Failed to regenerate code: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFiscalYearChange = async (month: string) => {
        if (month === company.fiscalYearStart) {
            setMonthDropdownOpen(false);
            return;
        }

        setIsSavingMonth(true);
        try {
            await updateCompany({
                name: company.name,
                industry: company.industry,
                currency: company.currency,
                fiscalYearStart: month
            });
            onUpdate();
        } catch (error: any) {
            alert('Failed to update fiscal year: ' + error.message);
        } finally {
            setIsSavingMonth(false);
            setMonthDropdownOpen(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const fiscalYearDisplay = `${currentYear}, ${company.fiscalYearStart || 'January'}`;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Team Settings</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage access and settings for your workspace.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Join Code Card - ADMIN ONLY */}
                {userRole === 'admin' ? (
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
                ) : (
                    // Member View
                    <div className="glass-panel p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">Member Access</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-xs">
                            You have view-only access to team settings. Contact your admin to manage invite codes.
                        </p>
                    </div>
                )}

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

                        {/* Fiscal Year Start - Editable for Admin */}
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl relative" ref={dropdownRef}>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Fiscal Year Start</span>

                            {userRole === 'admin' ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                                        disabled={isSavingMonth}
                                        className="flex items-center gap-2 font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 px-4 py-2 rounded-xl transition-all cursor-pointer group"
                                    >
                                        <Calendar className="w-4 h-4 text-indigo-500" />
                                        {isSavingMonth ? 'Saving...' : fiscalYearDisplay}
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {monthDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl dark:shadow-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-2 max-h-64 overflow-y-auto">
                                                {MONTHS.map((month) => (
                                                    <button
                                                        key={month}
                                                        onClick={() => handleFiscalYearChange(month)}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                            company.fiscalYearStart === month
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                        }`}
                                                    >
                                                        <span className="flex items-center justify-between">
                                                            {currentYear}, {month}
                                                            {company.fiscalYearStart === month && (
                                                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                                            )}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="font-bold text-slate-900 dark:text-white">{fiscalYearDisplay}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamSettings;
