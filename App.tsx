
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import AIChat from './components/AIChat';
import Projects from './components/Projects';
import { FinancialData, AIInsight, Company, UserProgress } from './types';
import { getFinancialInsights } from './services/geminiService';
import { fetchFinancialData, createInvoice, createExpense, updateInvoice, updateExpense, createPayableInvoice, updatePayableInvoice, createCreditNote, updateCreditNote } from './services/api';
import AuthPage from './components/AuthPage';
import CreateTransactionModal from './components/CreateTransactionModal';
import { Building2, Globe, Coins, Calendar, ArrowRight, Loader2, Rocket, Zap, Shield, PartyPopper, User as UserIcon, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeView, setActiveView] = useState('dashboard');
  const [financialData, setFinancialData] = useState<FinancialData>({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    points: 0,
    level: 1,
    nextLevelPoints: 1000,
    badges: [
      { id: 'b1', name: 'First Command', description: 'Initialize your workspace', icon: 'Rocket', unlocked: false, color: 'indigo' },
      { id: 'b2', name: 'Categorizer', description: 'Categorize 50 expenses', icon: 'Zap', unlocked: false, color: 'amber' }
    ],
    streaks: 0
  });
  const [pointsPopup, setPointsPopup] = useState<{ x: number, y: number, amount: number } | null>(null);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState<{ name: string; message: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'invoice' | 'expense' | 'payable' | 'credit_note'>('invoice');
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  const [company, setCompany] = useState<Company>({
    name: '',
    industry: 'Services',
    currency: 'USD',
    fiscalYearStart: 'January'
  });

  // Initial Data Load
  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Validate config first to trigger ErrorBoundary if missing keys
      import('./lib/supabase').then(m => m.validateConfig());

      const [data, companyData, userData] = await Promise.all([
        import('./services/api').then(m => m.fetchFinancialData()),
        import('./services/api').then(m => m.fetchCompany()),
        import('./services/auth').then(m => m.getMe())
      ]);

      setFinancialData(data);
      if (userData) {
        // Supabase User object puts custom fields in user_metadata
        const username = userData.user_metadata?.username || userData.email || 'User';
        setUserName(username);
        localStorage.setItem('userName', username);
      }

      if (companyData) {
        setCompany(companyData);
        setIsSetupComplete(true);
      } else {
        // Only force onboarding if it's truly a new user without a company
        setIsSetupComplete(false);
        setOnboardingStep(0);
      }

      // Load AI Insights in background
      if (data.invoices.length > 0 || data.projects.length > 0) {
        setIsLoadingInsights(true);
        const insights = await getFinancialInsights(data) as AIInsight[];
        setAiInsights(insights || []);
        setIsLoadingInsights(false);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      if (error instanceof Error && error.message === 'Unauthorized') {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (newToken: string, user: any, companyData?: any) => {
    localStorage.setItem('token', newToken);
    // Supabase User object puts custom fields in user_metadata
    const username = user.user_metadata?.username || user.email || 'User';
    localStorage.setItem('userName', username);
    setToken(newToken);
    setUserName(username);
    if (companyData) {
      setCompany(companyData);
      setIsSetupComplete(true);
    } else {
      setIsSetupComplete(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserName('');
    setIsSetupComplete(false);
    setFinancialData({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });
  };

  const finishOnboarding = async () => {
    try {
      setIsLoading(true);
      const me = await import('./services/auth').then(m => m.getMe());
      if (!me) {
        alert('Please sign in to initialize your workspace.');
        setIsSetupComplete(false);
        return;
      }
      const updatedCompany = await import('./services/api').then(m => m.updateCompany(company));
      setCompany(updatedCompany);
      setIsSetupComplete(true);
      await refreshData();
    } catch (error) {
      console.error('Failed to save company settings:', error);
      alert('Failed to initialize workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync theme with HTML element and localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const refreshData = async () => {
    try {
      // Clear stale state to force fresh calculations
      setFinancialData({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });

      // Force fresh Supabase fetch
      const data = await fetchFinancialData();
      setFinancialData(data);

      // Recalculate AI insights if we have data
      if (data.invoices.length > 0 || data.projects.length > 0) {
        setIsLoadingInsights(true);
        const insights = await getFinancialInsights(data) as AIInsight[];
        setAiInsights(insights || []);
        setIsLoadingInsights(false);
      } else {
        // Clear insights if no data
        setAiInsights([]);
      }
    } catch (err) {
      console.error("Failed to refresh data", err);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      setIsLoading(true);
      if (modalType === 'invoice') {
        await createInvoice(data);
      } else if (modalType === 'expense') {
        await createExpense(data);
      } else if (modalType === 'payable') {
        await createPayableInvoice(data);
      } else if (modalType === 'credit_note') {
        await createCreditNote(data);
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Creation failed", error);
      alert(`Failed to create transaction: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTransaction = async (id: string, data: any) => {
    try {
      setIsLoading(true);
      if (modalType === 'invoice') {
        await updateInvoice(id, data);
      } else if (modalType === 'expense') {
        await updateExpense(id, data);
      } else if (modalType === 'payable') {
        await updatePayableInvoice(id, data);
      } else if (modalType === 'credit_note') {
        await updateCreditNote(id, data);
      }
      await refreshData();
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (error: any) {
      console.error("Update failed", error);
      alert(`Update failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (type: 'invoice' | 'expense' | 'payable' | 'credit_note', data: any) => {
    setModalType(type);
    setEditingTransaction(data);
    setIsModalOpen(true);
  };

  const currencySymbol = useMemo(() => {
    switch (company.currency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'QAR': return 'QR';
      default: return '$';
    }
  }, [company.currency]);

  const addPoints = (amount: number, event?: React.MouseEvent | { clientX: number, clientY: number }) => {
    setUserProgress(prev => ({
      ...prev,
      points: prev.points + amount
    }));

    if (event) {
      const x = 'clientX' in event ? event.clientX : 0;
      const y = 'clientY' in event ? event.clientY : 0;
      setPointsPopup({ x, y, amount });
      setTimeout(() => setPointsPopup(null), 1000);
    }
  };

  const handleCategorizeExpense = (expenseId: string, event: React.MouseEvent) => {
    addPoints(75, event);
    setCategorizedCount(prev => {
      const next = prev + 1;
      if (next === 50) {
        setTimeout(() => unlockBadge('b2'), 100);
      }
      return next;
    });

    // Open edit modal for the expense
    const expense = financialData.expenses.find(e => e.id === expenseId);
    if (expense) {
      handleEditClick('expense', expense);
    }
  };

  const unlockBadge = (badgeId: string) => {
    setUserProgress(prev => {
      const existingBadge = prev.badges.find(b => b.id === badgeId);
      if (!existingBadge || existingBadge.unlocked) return prev;

      const updatedBadges = prev.badges.map(b => b.id === badgeId ? { ...b, unlocked: true } : b);
      const newlyUnlocked = updatedBadges.find(b => b.id === badgeId);

      if (newlyUnlocked) {
        setShowBadgeUnlock({
          name: newlyUnlocked.name,
          message: `Congratulations! You've officially earned the ${newlyUnlocked.name} title for your outstanding financial management.`
        });

        return {
          ...prev,
          points: prev.points + 500,
          badges: updatedBadges
        };
      }
      return { ...prev, badges: updatedBadges };
    });
    const timer = setTimeout(() => setShowBadgeUnlock(null), 8000);
    return () => clearTimeout(timer);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (isLoading && !isSetupComplete && onboardingStep === 1) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Securing your session...</p>
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-900'} flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500`}>
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-md w-full glass-panel border-white/10 bg-white/5 rounded-[3rem] p-10 shadow-2xl relative z-10 border">
          <div className="flex justify-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-900/50">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="mb-8 flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${onboardingStep >= i ? 'bg-indigo-500' : 'bg-white/10'}`}></div>
            ))}
          </div>

          {onboardingStep === 0 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-heading font-bold text-white mb-2">Welcome to Nexile</h2>
                <p className="text-slate-400">Let's set up your financial intelligence engine</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <button
                onClick={() => setOnboardingStep(1)}
                disabled={!userName || !company.name}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                Next Step <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {onboardingStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-heading font-bold text-white mb-2">Configure Workspace</h2>
                <p className="text-slate-400">Currency & accounting preferences</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <select
                    value={company.currency}
                    onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                  >
                    <option value="USD" className="bg-slate-900">USD - United States Dollar</option>
                    <option value="EUR" className="bg-slate-900">EUR - Euro</option>
                    <option value="GBP" className="bg-slate-900">GBP - British Pound</option>
                    <option value="QAR" className="bg-slate-900">QAR - Qatari Riyal</option>
                  </select>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <select
                    value={company.fiscalYearStart}
                    onChange={(e) => setCompany({ ...company, fiscalYearStart: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                  >
                    <option value="January" className="bg-slate-900">Fiscal Year: January</option>
                    <option value="April" className="bg-slate-900">Fiscal Year: April</option>
                    <option value="July" className="bg-slate-900">Fiscal Year: July</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setOnboardingStep(0)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-8 animate-in zoom-in duration-500 text-center">
              <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                {isLoading ? <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /> : <PartyPopper className="w-10 h-10 text-emerald-500" />}
              </div>
              <div>
                <h2 className="text-3xl font-heading font-bold text-white mb-2">Workspace Ready</h2>
                <p className="text-slate-400">{isLoading ? `Initializing OS for ${userName}...` : 'Your secure financial environment is prepared.'}</p>
              </div>
              <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl text-left">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Loaded Modules</div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> Multi-Tenant Isolation: Active</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> Scoped Database Connection: Stable</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> AI Analysis Cluster: Ready</li>
                </ul>
              </div>
              <button
                onClick={finishOnboarding}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Financial Command Center'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard data={financialData} insights={aiInsights} isLoadingInsights={isLoadingInsights} progress={userProgress} company={company} userName={userName} />;
      case 'workspace':
        return (
          <Workspace
            data={financialData}
            currencySymbol={currencySymbol}
            onCategorize={handleCategorizeExpense}
            onAddInvoice={() => { setModalType('invoice'); setEditingTransaction(null); setIsModalOpen(true); }}
            onAddExpense={() => { setModalType('expense'); setEditingTransaction(null); setIsModalOpen(true); }}
            onAddPayable={() => { setModalType('payable'); setEditingTransaction(null); setIsModalOpen(true); }}
            onAddCreditNote={() => { setModalType('credit_note'); setEditingTransaction(null); setIsModalOpen(true); }}
            onEditInvoice={(inv) => handleEditClick('invoice', inv)}
            onEditExpense={(exp) => handleEditClick('expense', exp)}
            onEditPayable={(pay) => handleEditClick('payable', pay)}
            onEditCreditNote={(cn) => handleEditClick('credit_note', cn)}
            onDataRefresh={refreshData}
          />
        );
      case 'ai-analyst':
        return <AIChat data={financialData} />;
      case 'projects':
        return <Projects data={financialData} currencySymbol={currencySymbol} onDataRefresh={refreshData} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-[3rem] border border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6">
              <Rocket className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Module Under Construction</h3>
            <p className="text-slate-500 dark:text-slate-400">This intelligence module is being calibrated for your industry.</p>
          </div>
        );
    }
  };

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      theme={theme}
      onThemeToggle={toggleTheme}
      userName={userName}
      onLogout={handleLogout}
    >
      <div className="relative">
        {renderView()}

        <CreateTransactionModal
          type={modalType}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
          onSubmit={handleCreateTransaction}
          editData={editingTransaction}
          onUpdate={handleUpdateTransaction}
          projects={financialData.projects}
          invoices={financialData.invoices}
          currencySymbol={currencySymbol}
        />

        {/* Gamification Points Popup Overlay */}
        {pointsPopup && (
          <div
            className="fixed z-[9999] pointer-events-none animate-bounce"
            style={{ left: pointsPopup.x, top: pointsPopup.y - 40 }}
          >
            <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold shadow-xl border border-indigo-500 shadow-indigo-200">
              <Zap className="w-4 h-4" /> +{pointsPopup.amount} XP
            </div>
          </div>
        )}

        {/* Badge Unlock Notification Overlay */}
        {showBadgeUnlock && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-indigo-900 text-white p-8 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(79,70,229,0.4)] border border-indigo-700/50 flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center animate-pulse">
                  <Shield className="w-12 h-12 text-indigo-400" />
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-4 border-indigo-900 animate-bounce">
                  <PartyPopper className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em]">New Achievement Unlocked</div>
                <h4 className="text-3xl font-bold font-heading text-white">{showBadgeUnlock.name}</h4>
                <p className="text-indigo-200 text-sm leading-relaxed px-4">
                  {showBadgeUnlock.message}
                </p>
                <div className="pt-4 flex items-center justify-center gap-2 text-amber-400 font-bold">
                  <Zap className="w-5 h-5" /> +500 Milestone Bonus XP
                </div>
              </div>

              <button
                onClick={() => setShowBadgeUnlock(null)}
                className="mt-8 px-10 py-3 bg-white text-indigo-900 font-bold rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Amazing, Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
