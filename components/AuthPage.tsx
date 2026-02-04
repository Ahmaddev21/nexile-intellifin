import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, Rocket, Shield, Users } from 'lucide-react';
import { login, signup } from '../services/auth';

interface AuthPageProps {
    onLogin: (token: string, user: any, company?: any) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    // Modes: 'login' | 'signup-create' | 'signup-join'
    const [authMode, setAuthMode] = useState<'login' | 'signup-create' | 'signup-join'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        companyName: '',
        currency: 'USD',
        joinCode: ''
    });

    const getFriendlyErrorMessage = (msg: string) => {
        if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
        if (msg.includes('User already registered')) return 'This email is already registered. Please sign in.';
        if (msg.includes('Invalid join code')) return 'The join code you entered is invalid or expired.';
        if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
        return msg;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (authMode === 'login') {
                const { token, user, company } = await login(formData.email, formData.password);
                onLogin(token, user, company);
            } else {
                // Signup (Create or Join)
                const { token, user, company } = await signup(
                    formData.username,
                    formData.email,
                    formData.password,
                    authMode === 'signup-create' ? formData.companyName : undefined,
                    authMode === 'signup-create' ? formData.currency : undefined,
                    authMode === 'signup-join' ? formData.joinCode : undefined
                );
                onLogin(token, user, company);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(getFriendlyErrorMessage(err.message || 'An unexpected error occurred.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[150px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600 rounded-full blur-[150px] animate-pulse-slow animation-delay-2000"></div>
            </div>

            <div className="max-w-md w-full glass-panel border-white/10 bg-white/5 rounded-[3rem] p-10 shadow-2xl relative z-10 border backdrop-blur-xl animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                        {authMode === 'signup-join' ? <Users className="w-10 h-10 text-white" /> : <Rocket className="w-10 h-10 text-white" />}
                    </div>
                    <h2 className="text-4xl font-heading font-bold text-white mb-3 tracking-tight">
                        {authMode === 'login' ? 'Welcome Back' : authMode === 'signup-create' ? 'Start Journey' : 'Join Team'}
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        {authMode === 'login'
                            ? 'Access your financial intelligence'
                            : authMode === 'signup-create'
                                ? 'Initialize your new command center'
                                : 'Enter your invite code to collaborate'}
                    </p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-300 text-sm animate-in slide-in-from-top-2">
                        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {authMode !== 'login' && (
                        <>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 placeholder:text-slate-600"
                                    required
                                />
                            </div>

                            {authMode === 'signup-create' ? (
                                <>
                                    <div className="relative group">
                                        <Rocket className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                        <input
                                            type="text"
                                            placeholder="Company Name"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 placeholder:text-slate-600"
                                            required
                                        />
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-4 pl-6 pr-10 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 appearance-none cursor-pointer"
                                        >
                                            <option value="USD">USD ($) - United States Dollar</option>
                                            <option value="EUR">EUR (€) - Euro</option>
                                            <option value="GBP">GBP (£) - British Pound</option>
                                            <option value="AED">AED (د.إ) - UAE Dirham</option>
                                            <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                                            <option value="QAR">QAR (QR) - Qatari Riyal</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            ▼
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="relative group">
                                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                    <input
                                        type="text"
                                        placeholder="ENTER 6-DIGIT CODE"
                                        value={formData.joinCode}
                                        onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-900/40 border-2 border-dashed border-indigo-500/30 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 tracking-[0.3em] font-mono text-center uppercase placeholder:text-slate-700 placeholder:tracking-normal"
                                        required
                                        maxLength={6}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 placeholder:text-slate-600"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/70 placeholder:text-slate-600"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 flex items-center justify-center gap-3 mt-8 group active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                {authMode === 'login' ? 'Sign In' : authMode === 'signup-create' ? 'Create Company' : 'Join Team'}
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </>
                        )}

                    </button>
                </form>

                <div className="mt-10 pt-6 border-t border-white/5 text-center flex flex-col gap-4">
                    {authMode === 'login' ? (
                        <>
                            <button
                                onClick={() => setAuthMode('signup-create')}
                                className="text-slate-400 hover:text-white transition-colors text-sm font-medium hover:underline decoration-indigo-500 underline-offset-4"
                            >
                                New here? <span className="text-indigo-400">Create a Company</span>
                            </button>
                            <button
                                onClick={() => setAuthMode('signup-join')}
                                className="text-slate-400 hover:text-white transition-colors text-sm font-medium hover:underline decoration-emerald-500 underline-offset-4"
                            >
                                Have a code? <span className="text-emerald-400">Join a Team</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setAuthMode('login')}
                            className="text-slate-400 hover:text-white transition-colors text-sm font-medium hover:underline decoration-indigo-500 underline-offset-4"
                        >
                            Already have an account? <span className="text-indigo-400">Sign In</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
