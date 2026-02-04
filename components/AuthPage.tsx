import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, Rocket, Shield } from 'lucide-react';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (authMode === 'login') {
                const { token, user, company, role } = await login(formData.email, formData.password);
                onLogin(token, user, company);
            } else {
                // Signup (Create or Join)
                const { token, user, company, role } = await signup(
                    formData.username,
                    formData.email,
                    formData.password,
                    authMode === 'signup-create' ? formData.companyName : undefined, // Only send name if creating
                    authMode === 'signup-create' ? formData.currency : undefined,
                    authMode === 'signup-join' ? formData.joinCode : undefined // Only send code if joining
                );
                onLogin(token, user, company);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-md w-full glass-panel border-white/10 bg-white/5 rounded-[3rem] p-10 shadow-2xl relative z-10 border animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                        <Rocket className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white mb-2">
                        {authMode === 'login' ? 'Welcome Back' : authMode === 'signup-create' ? 'Create Workspace' : 'Join Team'}
                    </h2>
                    <p className="text-slate-400">
                        {authMode === 'login'
                            ? 'Enter your credentials to access the terminal'
                            : authMode === 'signup-create'
                                ? 'Initialize a new financial command center'
                                : 'Enter your team code to access the workspace'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm">
                        <Shield className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {authMode !== 'login' && (
                        <>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80"
                                    required
                                />
                            </div>

                            {authMode === 'signup-create' ? (
                                <>
                                    <div className="relative group">
                                        <Rocket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                        <input
                                            type="text"
                                            placeholder="Company Name"
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80"
                                            required
                                        />
                                    </div>
                                    <div className="relative group">
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-4 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80 appearance-none"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="AED">AED (د.إ)</option>
                                            <option value="SAR">SAR (﷼)</option>
                                            <option value="QAR">QAR (QR)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="relative group">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                                    <input
                                        type="text"
                                        placeholder="Enter 6-Digit Join Code"
                                        value={formData.joinCode}
                                        onChange={(e) => setFormData({ ...formData, joinCode: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80 tracking-widest font-mono"
                                        required
                                        maxLength={6}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 transition-colors group-focus-within:text-indigo-400" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all focus:bg-slate-900/80"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-6 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {authMode === 'login' ? 'Sign In' : authMode === 'signup-create' ? 'Create Company' : 'Join Team'}
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </>
                        )}

                    </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-2">
                    {authMode === 'login' ? (
                        <>
                            <button
                                onClick={() => setAuthMode('signup-create')}
                                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Don't have an account? Create Company
                            </button>
                            <button
                                onClick={() => setAuthMode('signup-join')}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                            >
                                Have a team code? Join Existing
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setAuthMode('login')}
                            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Already have an account? Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
