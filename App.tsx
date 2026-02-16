import React, { useState, useEffect, useMemo, useRef } from 'react';
import TeamSettings from './components/TeamSettings';
import Reports from './components/Reports';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';
import Projects from './components/Projects';
import { FinancialData, AIInsight, Company, UserProgress } from './types';
import { getFinancialInsights } from './services/geminiService';
import { fetchFinancialData, createInvoice, createExpense, updateInvoice, updateExpense, createPayableInvoice, updatePayableInvoice, createCreditNote, updateCreditNote } from './services/api';
import AuthPage from './components/AuthPage';
import CreateTransactionModal from './components/CreateTransactionModal';
import Pricing from './components/Pricing';
import { useSubscription } from './hooks/useSubscription';
import { supabase } from './lib/supabase';
import { ArrowRight, Loader2, Rocket, Zap, Shield, PartyPopper, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeView, setActiveView] = useState('dashboard');
  const [financialData, setFinancialData] = useState<FinancialData>({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
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
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [userId, setUserId] = useState<string | null>(null);

  const [company, setCompany] = useState<Company>({
    name: '',
    industry: 'Services',
    currency: 'USD',
    fiscalYearStart: 'January'
  });

  const { subscription, isLoading: isSubscriptionLoading, isActive: isSubscriptionActive, refetch: refetchSubscription } = useSubscription(company.id);

  // Flag to prevent loadInitialData from overriding handleLogin's state
  const loginJustCompleted = useRef(false);

  // Initial Data Load
  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  // Subscription Enforcement
  useEffect(() => {
    if (isSetupComplete && !isSubscriptionLoading && !isSubscriptionActive() && activeView !== 'pricing') {
      // If setup is done, subscription loaded, but inactive -> force pricing
      // Exception: If user role is admin they can pay. If member, they see lock screen (handled in Pricing or AccessDenied)
      setActiveView('pricing');
    }
  }, [isSetupComplete, isSubscriptionLoading, subscription, activeView]);

  const loadInitialData = async () => {
    // If handleLogin just ran, it already set company + isSetupComplete.
    // Skip the company fetch to avoid overriding that state.
    const skipCompanyFetch = loginJustCompleted.current;
    loginJustCompleted.current = false;

    setIsLoading(true);
    try {
      // Validate config first to trigger ErrorBoundary if missing keys
      import('./lib/supabase').then(m => m.validateConfig());

      // Attempt to extract userId from token aggressively
      let extractedUserId = undefined;
      if (token) {
        try {
          const payload = token.split('.')[1];
          if (payload) {
            const decoded = JSON.parse(atob(payload));
            if (decoded && decoded.sub) extractedUserId = decoded.sub;
          }
        } catch (e) { }
      }

      const [data, userData] = await Promise.all([
        import('./services/api').then(m => m.fetchFinancialData()),
        import('./services/auth').then(m => m.getMe())
      ]);

      setFinancialData(data);
      if (userData) {
        const username = userData.user_metadata?.username || userData.email || 'User';
        setUserName(username);
        setUserId(userData.id);
        localStorage.setItem('userName', username);

        const savedRole = localStorage.getItem('userRole') as 'admin' | 'member';
        if (savedRole) setUserRole(savedRole);
      }

      // Only fetch company if handleLogin didn't already set it
      if (!skipCompanyFetch) {
        const companyData = await import('./services/api').then(m => m.fetchCompany(extractedUserId));

        if (companyData) {
          setCompany(companyData);
          setIsSetupComplete(true);
          if (userData?.id) {
            import('./services/api').then(m => m.getUserRole(userData.id)).then(role => {
              if (role) {
                setUserRole(role);
                localStorage.setItem('userRole', role);
              }
            });
          }
        } else {
          setIsSetupComplete(false);
        }
      } else {
        // handleLogin already set company, just fetch role if needed
        if (userData?.id) {
          import('./services/api').then(m => m.getUserRole(userData.id)).then(role => {
            if (role) {
              setUserRole(role);
              localStorage.setItem('userRole', role);
            }
          });
        }
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

  const handleLogin = (newToken: string, user: any, companyData?: any, role: 'admin' | 'member' = 'member') => {
    // Set flag BEFORE updating token so loadInitialData doesn't override our state
    loginJustCompleted.current = true;

    localStorage.setItem('token', newToken);
    const username = user.user_metadata?.username || user.email || 'User';
    localStorage.setItem('userName', username);
    localStorage.setItem('userRole', role);

    setToken(newToken);
    setUserName(username);
    setUserId(user.id);
    setUserRole(role);

    if (companyData) {
      // Map the raw Supabase company object to our Company type
      const mapped = {
        name: companyData.name || '',
        industry: companyData.industry || 'Services',
        currency: companyData.currency || 'USD',
        fiscalYearStart: companyData.fiscal_year_start || companyData.fiscalYearStart || 'January',
        joinCode: companyData.join_code || companyData.joinCode,
        id: companyData.id
      };
      setCompany(mapped);
      setIsSetupComplete(true);
    } else {
      // No company found - user will see AuthPage to create/join one
      setIsSetupComplete(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setToken(null);
    setUserName('');
    setUserId(null);
    setUserRole('member');
    setIsSetupComplete(false);
    setFinancialData({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });

    // Force reload to clear all states and hooks
    // This is the most reliable way to reset the app state completely
    window.location.href = '/';
  };

  // finishOnboarding REMOVED - company creation now happens in AuthPage during signup

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
      // Clear stale state to force fresh calculations - REMOVED to prevent UI flash
      // setFinancialData({ projects: [], invoices: [], expenses: [], payableInvoices: [], creditNotes: [] });

      // Force fresh Supabase fetch
      const [data, companyData] = await Promise.all([
        fetchFinancialData(),
        import('./services/api').then(m => m.fetchCompany())
      ]);

      setFinancialData(data);
      if (companyData) {
        setCompany(companyData);
      }

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

  const handleCategorizeExpense = async (expenseId: string, event: React.MouseEvent) => {
    addPoints(75, event);

    // Call API to persist points
    import('./services/api').then(m => m.incrementPoints(75));

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

  if (isLoading && !isSetupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Securing your session...</p>
        </div>
      </div>
    );
  }

  // Show loading for subscription check if we are logged in and setup
  if (isSetupComplete && isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // If user is logged in but has NO company, show AuthPage again so they can create/join one
  if (!isSetupComplete) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard data={financialData} insights={aiInsights} isLoadingInsights={isLoadingInsights} progress={userProgress} company={company} userName={userName} currentUserId={userId || undefined} />;
      case 'workspace':
        return (
          <Workspace
            data={financialData}
            company={company}
            userRole={userRole}
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

      case 'projects':
        return <Projects data={financialData} currencySymbol={currencySymbol} onDataRefresh={refreshData} userRole={userRole} />;
      case 'pricing':
        return (
          <div className="relative z-50">
            <Pricing
              companyId={company.id || ''}
              currentUserId={userId || ''}
              onUpgradeSuccess={() => refetchSubscription()}
            />
          </div>
        );
      case 'team':
        return <TeamSettings company={company} onUpdate={refreshData} userRole={userRole} />;
      case 'reports':
        return <Reports />;
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
