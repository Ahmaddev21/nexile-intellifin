import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Filter, ChevronDown, ChevronUp, ArrowUpDown, Search, RefreshCw, User, Calendar, Loader2, ShieldCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { AuditLog } from '../types';
import { fetchAuditLogs } from '../services/api';

const TABLE_LABELS: Record<string, string> = {
    invoices: 'Invoice',
    expenses: 'Expense',
    payable_invoices: 'Payable',
    credit_notes: 'Credit Note',
    projects: 'Project',
};

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof Plus }> = {
    INSERT: { label: 'Created', color: 'emerald', icon: Plus },
    UPDATE: { label: 'Edited', color: 'amber', icon: Pencil },
    DELETE: { label: 'Deleted', color: 'rose', icon: Trash2 },
};

type SortField = 'timestamp' | 'userName' | 'tableName' | 'action' | 'amount';
type SortDir = 'asc' | 'desc';

interface ReportsProps {
    companyName?: string;
}

const Reports: React.FC<ReportsProps> = ({ companyName = 'Company' }) => {
    // --- Audit Trail State ---
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUser, setFilterUser] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterAction, setFilterAction] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState<SortField>('timestamp');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAuditLogs();
            setLogs(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    const extractAmount = (log: AuditLog): number | null => {
        const data = log.newData || log.oldData;
        if (data && typeof data.amount === 'number') return data.amount;
        if (data && typeof data.amount === 'string') return parseFloat(data.amount);
        return null;
    };

    const extractClientOrVendor = (log: AuditLog): string => {
        const data = log.newData || log.oldData;
        if (!data) return '-';
        return data.client_name || data.vendor_name || data.name || data.category || '-';
    };

    // Unique users for filter dropdown
    const uniqueUsers = useMemo(() => {
        const users = [...new Set(logs.map(l => l.userName))];
        return users.sort();
    }, [logs]);

    // Filtered and sorted logs
    const filteredLogs = useMemo(() => {
        let result = logs;

        if (filterUser !== 'all') {
            result = result.filter(l => l.userName === filterUser);
        }
        if (filterType !== 'all') {
            result = result.filter(l => l.tableName === filterType);
        }
        if (filterAction !== 'all') {
            result = result.filter(l => l.action === filterAction);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.userName.toLowerCase().includes(q) ||
                (TABLE_LABELS[l.tableName] || l.tableName).toLowerCase().includes(q) ||
                extractClientOrVendor(l).toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'timestamp':
                    cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                    break;
                case 'userName':
                    cmp = a.userName.localeCompare(b.userName);
                    break;
                case 'tableName':
                    cmp = a.tableName.localeCompare(b.tableName);
                    break;
                case 'action':
                    cmp = a.action.localeCompare(b.action);
                    break;
                case 'amount':
                    cmp = (extractAmount(a) ?? 0) - (extractAmount(b) ?? 0);
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [logs, filterUser, filterType, filterAction, searchQuery, sortField, sortDir]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />;
    };

    const formatDate = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Loading audit trail...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to Load Audit Logs</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
                <button onClick={loadLogs} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">Reports</h2>
                    <p className="text-slate-500 dark:text-slate-400">View activity logs and generate financial statements.</p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-xl text-sm font-bold">
                                {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
                            </div>
                            <button
                                onClick={loadLogs}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    </div>

            {/* Search + Filter Bar */}
            <div className="glass-panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by user, type, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${showFilters
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {(filterUser !== 'all' || filterType !== 'all' || filterAction !== 'all') && (
                            <span className="w-2 h-2 bg-amber-400 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Filter Dropdowns */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">User</label>
                            <select
                                value={filterUser}
                                onChange={(e) => setFilterUser(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="all">All Users</option>
                                {uniqueUsers.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Entry Type</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="all">All Types</option>
                                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Action</label>
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="all">All Actions</option>
                                <option value="INSERT">Created</option>
                                <option value="UPDATE">Edited</option>
                                <option value="DELETE">Deleted</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Table */}
            {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Audit Entries</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No activity logs match your current filters.</p>
                </div>
            ) : (
                <div className="glass-panel rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="text-left px-6 py-4">
                                        <button onClick={() => handleSort('userName')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                            <User className="w-3.5 h-3.5" /> User <SortIcon field="userName" />
                                        </button>
                                    </th>
                                    <th className="text-left px-6 py-4">
                                        <button onClick={() => handleSort('action')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                            Action <SortIcon field="action" />
                                        </button>
                                    </th>
                                    <th className="text-left px-6 py-4">
                                        <button onClick={() => handleSort('tableName')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                            <FileText className="w-3.5 h-3.5" /> Entry Type <SortIcon field="tableName" />
                                        </button>
                                    </th>
                                    <th className="text-left px-6 py-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</span>
                                    </th>
                                    <th className="text-right px-6 py-4">
                                        <button onClick={() => handleSort('amount')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-auto">
                                            Amount <SortIcon field="amount" />
                                        </button>
                                    </th>
                                    <th className="text-right px-6 py-4">
                                        <button onClick={() => handleSort('timestamp')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-auto">
                                            <Calendar className="w-3.5 h-3.5" /> Date & Time <SortIcon field="timestamp" />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log, idx) => {
                                    const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'slate', icon: FileText };
                                    const ActionIcon = actionCfg.icon;
                                    const amount = extractAmount(log);
                                    const description = extractClientOrVendor(log);

                                    return (
                                        <tr
                                            key={log.id}
                                            className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${idx === filteredLogs.length - 1 ? 'border-b-0' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                            {log.userName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{log.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-${actionCfg.color}-100 dark:bg-${actionCfg.color}-900/30 text-${actionCfg.color}-700 dark:text-${actionCfg.color}-400`}>
                                                    <ActionIcon className="w-3 h-3" />
                                                    {actionCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {TABLE_LABELS[log.tableName] || log.tableName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate max-w-[200px] block">
                                                    {description}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {amount !== null ? (
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                                                        {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(log.timestamp)}</div>
                                                <div className="text-xs text-slate-400">{formatTime(log.timestamp)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
