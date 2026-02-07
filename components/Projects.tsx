import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Target, Calendar, Loader2, Plus, Lightbulb, ChevronDown, ChevronUp, MoreVertical, Trash2, Edit3, CheckCircle2, Clock, Ban, Archive } from 'lucide-react';
import { FinancialData, ProjectFinancialDetail, ProjectHealthScore as HealthScoreType, EarlyWarning, AIRecommendation, AutoInsight } from '../types';
import { fetchProjectDetail, updateProject, deleteProject } from '../services/api';
import { calculateHealthScore, generateEarlyWarnings, generateProjectRecommendations, generateAutoInsights } from '../services/geminiService';
import { calculateProjectFinancials } from '../utils/financialCalculations';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import ProjectHealthScore from './ProjectHealthScore';
import EarlyWarningBanner from './EarlyWarningBanner';
import ScenarioSimulator from './ScenarioSimulator';
import AddProjectModal from './AddProjectModal';

interface ProjectsProps {
    data: FinancialData;
    currencySymbol: string;
    onDataRefresh: () => void;
    userRole: 'admin' | 'member';
}

const Projects: React.FC<ProjectsProps> = ({ data, currencySymbol, onDataRefresh, userRole }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projectDetail, setProjectDetail] = useState<ProjectFinancialDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Advanced features state
    const [healthScore, setHealthScore] = useState<HealthScoreType | null>(null);
    const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [autoInsights, setAutoInsights] = useState<AutoInsight[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // UI state
    const [showInsights, setShowInsights] = useState(true);
    const [showRecommendations, setShowRecommendations] = useState(true);

    // Sync project detail when data changes
    useEffect(() => {
        if (selectedProjectId) {
            loadProjectDetail(selectedProjectId);
        }
    }, [data]);

    // Calculate project metrics for list view
    const projectMetrics = useMemo(() => {
        return data.projects.map(p => {
            const detail = calculateProjectFinancials(
                p,
                data.invoices,
                data.expenses,
                data.payableInvoices || [],
                data.creditNotes || []
            );

            // Compute first activity date (earliest associated item)
            const invDates = data.invoices.filter(i => i.projectId === p.id).map(i => i.date);
            const expDates = data.expenses.filter(e => e.projectId === p.id).map(e => e.date);
            const payDates = (data.payableInvoices || []).filter(pi => pi.projectId === p.id).map(pi => pi.date);
            // Optional: include credit notes if they reference an invoice for this project (best-effort)
            const creditDates = (data.creditNotes || [])
                .filter(cn => {
                    if (!cn.invoiceId) return false;
                    const inv = data.invoices.find(i => i.id === cn.invoiceId);
                    return inv ? inv.projectId === p.id : false;
                })
                .map(cn => cn.createdAt);
            const allDates = [...invDates, ...expDates, ...payDates, ...creditDates].filter(Boolean);
            const firstActivityDate = allDates.length
                ? new Date(Math.min(...allDates.map(d => new Date(d).getTime()))).toISOString()
                : undefined;

            return {
                ...p,
                revenue: detail.paidRevenue,
                // expectedRevenue: detail.expectedRevenue, // Removed to preserve the project's target revenue (p.expectedRevenue)
                paidOpExpenses: detail.paidOpExpenses,
                totalOpExpenses: detail.totalOpExpenses,
                paidPayables: detail.paidPayables,
                totalPayables: detail.totalPayables,
                profit: detail.netProfit,
                margin: parseFloat(detail.profitMargin.toFixed(1)),
                firstActivityDate
            };
        });
    }, [data.projects, data.invoices, data.expenses, data.payableInvoices, data.creditNotes]);

    const loadProjectDetail = async (projectId: string) => {
        setIsLoading(true);
        try {
            const detail = await fetchProjectDetail(projectId);
            setProjectDetail(detail);
            setSelectedProjectId(projectId);

            // Calculate advanced features
            const score = calculateHealthScore(detail);
            setHealthScore(score);

            const earlyWarnings = generateEarlyWarnings(detail);
            setWarnings(earlyWarnings);

            const insights = generateAutoInsights(detail.monthlyBreakdown);
            setAutoInsights(insights);

            // Load AI recommendations
            setIsLoadingRecommendations(true);
            try {
                const recs = await generateProjectRecommendations(detail);
                setRecommendations(recs);
            } catch (error) {
                console.error('Failed to load recommendations:', error);
            } finally {
                setIsLoadingRecommendations(false);
            }
        } catch (error) {
            console.error('Failed to load project detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatMonthDisplay = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const handleProjectCreated = () => {
        onDataRefresh();
        setIsModalOpen(false);
    };

    const handleUpdateStatus = async (projectId: string, newStatus: string) => {
        setIsProcessing(projectId);
        try {
            await updateProject(projectId, { status: newStatus });
            onDataRefresh();
            setActiveMenu(null);
        } catch (error: any) {
            console.error('Failed to update project status:', error);
            alert(`Failed to update status: ${error.message}`);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm('Are you sure you want to delete this project? This will archive the project but preserve related financial data.')) return;

        setIsProcessing(projectId);
        try {
            await deleteProject(projectId);
            onDataRefresh();
            setActiveMenu(null);
        } catch (error: any) {
            console.error('Failed to delete project:', error);
            alert(`Failed to delete project: ${error.message}`);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleEditProject = (project: any) => {
        setEditingProject(project);
        setIsModalOpen(true);
        setActiveMenu(null);
    };

    // Project List View
    if (!selectedProjectId) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Projects</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage and analyze your project portfolio</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Project
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectMetrics.map(project => (
                        <div
                            key={project.id}
                            onClick={() => loadProjectDetail(project.id)}
                            className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all hover:-translate-y-1 text-left bg-white dark:bg-slate-900 group relative cursor-pointer"
                        >
                            {isProcessing === project.id && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4 relative">
                                <div className="flex-1">
                                    <h3
                                        className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                    >
                                        {project.name}
                                    </h3>
                                    {project.createdAt && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Project Creation: {new Date(project.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}
                                    {project.firstActivityDate && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            First Activity: {new Date(project.firstActivityDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}
                                    {project.lastActivityDate && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            Last Activity: {new Date(project.lastActivityDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}
                                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold ${project.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                        project.status === 'completed' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
                                            project.status === 'archived' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500' :
                                                'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                        }`}>
                                        {project.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1 ${project.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {project.profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenu(activeMenu === project.id ? null : project.id);
                                            }}
                                            className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                        {activeMenu === project.id && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="p-2 space-y-1">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Set Status</div>
                                                    {[
                                                        { id: 'active', label: 'Active', icon: Clock, color: 'text-emerald-500' },
                                                        { id: 'on-hold', label: 'On Hold', icon: Ban, color: 'text-amber-500' },
                                                        { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-indigo-500' },
                                                        { id: 'archived', label: 'Archive', icon: Archive, color: 'text-slate-400' }
                                                    ].map((s) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(project.id, s.id); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl transition-all ${project.status === s.id ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            <s.icon className={`w-4 h-4 ${s.color}`} />
                                                            {s.label}
                                                        </button>
                                                    ))}

                                                    {userRole === 'admin' && (
                                                        <>
                                                            <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"
                                                            >
                                                                <Edit3 className="w-4 h-4 text-indigo-500" />
                                                                Edit Project
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete Project
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        <span>Revenue</span>
                                        <span>{project.revenue > 0 ? 'Actual' : 'Target'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Expected</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{(project.expectedRevenue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Paid (Actual)</span>
                                        <span className={`font-bold ${project.revenue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                            {currencySymbol}{project.revenue.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Operational Expenses */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        <span>Op. Expenses</span>
                                        <span>Actual</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{(project.totalOpExpenses || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Paid</span>
                                        <span className={`font-bold ${(project.paidOpExpenses || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                            {currencySymbol}{(project.paidOpExpenses || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Payables (Bills) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        <span>Payables (Bills)</span>
                                        <span>Liabilities</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{currencySymbol}{(project.totalPayables || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Paid</span>
                                        <span className={`font-bold ${(project.paidPayables || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                            {currencySymbol}{(project.paidPayables || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">Net Profit (Paid)</span>
                                    <span className={`font-bold ${project.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {project.profit >= 0 ? '+' : ''}{currencySymbol}{project.profit.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <span
                                    onClick={(e) => { e.stopPropagation(); loadProjectDetail(project.id); }}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline cursor-pointer"
                                >
                                    View Details →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <AddProjectModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
                    onSuccess={handleProjectCreated}
                    editingProject={editingProject}
                />
            </div>
        );
    }

    // Project Detail View
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!projectDetail) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        setSelectedProjectId(null);
                        setProjectDetail(null);
                        setHealthScore(null);
                        setWarnings([]);
                        setRecommendations([]);
                        setAutoInsights([]);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-600 dark:text-slate-400"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">{projectDetail.project.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${projectDetail.project.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                            projectDetail.project.status === 'completed' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
                                'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            }`}>
                            {projectDetail.project.status.toUpperCase()}
                        </span>
                        {projectDetail.project.createdAt && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Created {new Date(projectDetail.project.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                        {data && (
                            (() => {
                                const p = projectDetail.project;
                                const invDates = data.invoices.filter(i => i.projectId === p.id).map(i => i.date);
                                const expDates = data.expenses.filter(e => e.projectId === p.id).map(e => e.date);
                                const payDates = (data.payableInvoices || []).filter(pi => pi.projectId === p.id).map(pi => pi.date);
                                const creditDates = (data.creditNotes || [])
                                    .filter(cn => {
                                        if (!cn.invoiceId) return false;
                                        const inv = data.invoices.find(i => i.id === cn.invoiceId);
                                        return inv ? inv.projectId === p.id : false;
                                    })
                                    .map(cn => cn.createdAt);
                                const allDates = [...invDates, ...expDates, ...payDates, ...creditDates].filter(Boolean);
                                const firstActivityDate = allDates.length
                                    ? new Date(Math.min(...allDates.map(d => new Date(d).getTime())))
                                    : null;
                                return firstActivityDate ? (
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        First Activity {firstActivityDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                ) : null;
                            })()
                        )}
                        {warnings.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full font-bold">
                                ⚠️ {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Health Score */}
            {healthScore && <ProjectHealthScore healthScore={healthScore} />}

            {/* Early Warnings */}
            {warnings.length > 0 && <EarlyWarningBanner warnings={warnings} />}

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">Actual (Paid)</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currencySymbol}{projectDetail.paidRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>Projected:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{currencySymbol}{projectDetail.projectedRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Op. Expenses</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full">Actual (Paid)</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currencySymbol}{projectDetail.paidOpExpenses.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>Total OpEx:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{currencySymbol}{projectDetail.totalOpExpenses.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payables</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">Liabilities</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {currencySymbol}{projectDetail.totalPayables.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>Paid:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{currencySymbol}{projectDetail.paidPayables.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">Actual</span>
                    </div>
                    <div className="space-y-1">
                        <div className={`text-2xl font-bold ${projectDetail.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {projectDetail.netProfit >= 0 ? '+' : ''}{currencySymbol}{projectDetail.netProfit.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>Expected:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                {currencySymbol}{((projectDetail.project.expectedRevenue || 0) - projectDetail.project.budget).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margin</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">Actual</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {projectDetail.profitMargin.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                            <span>Target:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                {projectDetail.project.expectedRevenue ? (((projectDetail.project.expectedRevenue - projectDetail.project.budget) / projectDetail.project.expectedRevenue) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scenario Simulator */}
            <ScenarioSimulator
                currentRevenue={projectDetail.paidRevenue}
                currentExpenses={projectDetail.paidOpExpenses + projectDetail.paidPayables}
                currentProfit={projectDetail.netProfit}
                currentMargin={projectDetail.profitMargin}
                currencySymbol={currencySymbol}
            />

            {/* Budget vs Actual */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Budget vs Actual
                </h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Budget', value: projectDetail.budgetVsActual.budget },
                            { name: 'Actual', value: projectDetail.budgetVsActual.actual }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                            />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                                <Cell fill="#6366f1" />
                                <Cell fill={projectDetail.budgetVsActual.variance >= 0 ? '#10b981' : '#f43f5e'} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Variance:</span>
                    <span className={`font-bold ${projectDetail.budgetVsActual.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {projectDetail.budgetVsActual.variance >= 0 ? '+' : ''}{currencySymbol}{projectDetail.budgetVsActual.variance.toLocaleString()} ({projectDetail.budgetVsActual.variancePercent.toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Auto-Insights Timeline */}
            {autoInsights.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setShowInsights(!showInsights)}
                        className="w-full flex justify-between items-center mb-4"
                    >
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            Auto-Insights Timeline
                        </h3>
                        {showInsights ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>
                    {showInsights && (
                        <div className="space-y-3">
                            {autoInsights.map((insight, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {formatMonthDisplay(insight.previousMonth)} → {formatMonthDisplay(insight.month)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{insight.insight}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Month-by-Month Breakdown Table */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Month-by-Month Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Month</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Revenue</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Expenses</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Profit/Loss</th>
                                <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectDetail.monthlyBreakdown.map((month, idx) => (
                                <tr key={month.month} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{formatMonthDisplay(month.month)}</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-900 dark:text-white">{currencySymbol}{month.revenue.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-sm text-right text-slate-900 dark:text-white">{currencySymbol}{month.expenses.toLocaleString()}</td>
                                    <td className={`py-3 px-4 text-sm text-right font-bold ${month.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {month.netProfit >= 0 ? '+' : ''}{currencySymbol}{month.netProfit.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right">
                                        {month.profitChange !== undefined ? (
                                            <span className={`font-bold ${month.profitChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {month.profitChange >= 0 ? '+' : ''}{month.profitChange.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500 text-xs">First month</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Monthly Profit Timeline */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Monthly Profit Timeline</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectDetail.monthlyBreakdown.map(m => ({
                            month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                            profit: m.netProfit
                        }))}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415510" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#0f172a', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* AI Recommendations */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                    onClick={() => setShowRecommendations(!showRecommendations)}
                    className="w-full flex justify-between items-center mb-4"
                >
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-indigo-500" />
                        AI Recommendations
                    </h3>
                    {showRecommendations ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {showRecommendations && (
                    <div className="space-y-3">
                        {isLoadingRecommendations ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            </div>
                        ) : recommendations.length > 0 ? (
                            recommendations.map((rec, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border ${rec.priority === 'high' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' :
                                    rec.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <span className={`text-2xl ${rec.priority === 'high' ? '🔴' :
                                            rec.priority === 'medium' ? '🟡' : '🔵'
                                            }`}></span>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{rec.title}</h4>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{rec.description}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">Impact: {rec.impact}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recommendations available</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Projects;
