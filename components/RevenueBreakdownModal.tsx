import React, { useMemo, useState } from 'react';
import { X, Search, Filter, SortAsc, SortDesc, DollarSign, Minus } from 'lucide-react';
import { Invoice, CreditNote } from '../types';

interface RevenueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  creditNotes: CreditNote[];
  currencySymbol: string;
}

const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({ isOpen, onClose, invoices, creditNotes, currencySymbol }) => {
  const [groupBy, setGroupBy] = useState<'none' | 'project' | 'client' | 'month' | 'status'>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Restore missing state assignments
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Effect moved down after groupedData definition

  const appliedCreditsByInvoice = useMemo(() => {
    const map: Record<string, number> = {};
    (creditNotes || [])
      .filter(c => c.status === 'applied' && !!c.invoiceId)
      .forEach(c => {
        const ref = c.invoiceId as string;
        map[ref] = (map[ref] || 0) + c.amount;
      });
    return map;
  }, [creditNotes]);

  // Base rows with net revenue calculated
  const baseRows = useMemo(() => {
    const items = invoices.map(inv => {
      const applied = appliedCreditsByInvoice[inv.id] || 0;
      const net = inv.status === 'paid' ? Math.max(inv.amount - applied, 0) : 0;
      return {
        id: inv.id,
        project: inv.projectName,
        client: inv.clientName || 'Unknown Client',
        date: inv.date,
        amount: inv.amount,
        status: inv.status,
        appliedCredit: applied,
        netRevenue: net
      };
    });

    let filtered = items;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      filtered = filtered.filter(i =>
        i.id.toLowerCase().includes(q) ||
        (i.project || '').toLowerCase().includes(q) ||
        (i.client || '').toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'date') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
      }
      if (sortKey === 'amount') {
        return (a.amount - b.amount) * dir;
      }
      return (a.status.localeCompare(b.status)) * dir;
    });
  }, [invoices, appliedCreditsByInvoice, statusFilter, query, sortKey, sortDir]);

  const totals = useMemo(() => {
    // Sum visible rows (baseRows is already filtered by status)
    const sumAmount = baseRows.reduce((s, i) => s + i.amount, 0);
    const sumCredits = baseRows.reduce((s, i) => s + i.appliedCredit, 0);
    // For paid invoices, net is amount - credits. For others, it's just the amount (outstanding)
    const net = baseRows.reduce((s, i) => s + (i.status === 'paid' ? i.netRevenue : i.amount), 0);
    return { sumAmount, sumCredits, net };
  }, [baseRows]);

  // Grouped Data Logic
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups: Record<string, typeof baseRows> = {};

    baseRows.forEach(row => {
      let key = '';
      switch (groupBy) {
        case 'project': key = row.project || 'Unassigned'; break;
        case 'client': key = row.client; break;
        case 'month': key = row.date.substring(0, 7); break; // YYYY-MM
        case 'status': key = row.status.toUpperCase(); break;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    // Transform to array with metrics
    const groupList = Object.entries(groups).map(([key, items]) => {
      const groupNet = items.reduce((sum, item) => sum + item.netRevenue, 0);
      const groupAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const groupCredits = items.reduce((sum, item) => sum + item.appliedCredit, 0);

      return {
        key,
        items,
        metrics: {
          net: groupNet,
          amount: groupAmount,
          credits: groupCredits,
          percent: totals.net > 0 ? (groupNet / totals.net) * 100 : 0
        }
      };
    });

    // Sort groups by Net Revenue Descending
    return groupList.sort((a, b) => b.metrics.net - a.metrics.net);

  }, [baseRows, groupBy, totals.net]);

  // Expand all groups effect (Corrected)
  React.useEffect(() => {
    if (groupedData) {
      setExpandedGroups(new Set(groupedData.map(g => g.key)));
    }
  }, [groupedData?.length, groupBy]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="max-w-6xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-start shrink-0 z-20">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Revenue Breakdown</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Detailed analysis of paid invoices and applied credits
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row gap-3 items-stretch shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Group By Control */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1">
              <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Group By:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer py-1.5"
              >
                <option value="none">None (List)</option>
                <option value="project">Project</option>
                <option value="client">Client</option>
                <option value="month">Month</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                {groupBy !== 'none' && <th className="w-8 px-4 py-3"></th>}
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client / Project</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Credits</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Rev</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {groupBy === 'none' ? (
                // Flat List
                baseRows.map(r => (
                  <InvoiceRow key={r.id} row={r} currencySymbol={currencySymbol} />
                ))
              ) : (
                // Grouped List
                groupedData?.map(group => (
                  <React.Fragment key={group.key}>
                    {/* Group Header */}
                    <tr
                      onClick={() => toggleGroup(group.key)}
                      className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500">
                        {expandedGroups.has(group.key) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                      <td colSpan={3} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{group.key}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                            {group.items.length}
                          </span>
                          <div className="flex items-center gap-1 ml-auto md:ml-2">
                            <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${group.metrics.percent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{group.metrics.percent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 font-medium text-slate-400 text-xs">
                        {/* Placeholder for alignment */}
                      </td>
                      <td className="text-right px-4 py-3 text-xs font-bold text-slate-500">
                        -{currencySymbol}{group.metrics.credits.toLocaleString()}
                      </td>
                      <td className="text-right px-4 py-3 text-sm font-black text-slate-900 dark:text-white">
                        {currencySymbol}{group.metrics.net.toLocaleString()}
                      </td>
                    </tr>

                    {/* Group Items */}
                    {expandedGroups.has(group.key) && group.items.map(r => (
                      <InvoiceRow key={r.id} row={r} currencySymbol={currencySymbol} indented />
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (Grand Total) */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {statusFilter === 'all' ? 'All Invoices' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} ({baseRows.length} items)
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                  {statusFilter === 'overdue' ? 'Total Overdue' : statusFilter === 'sent' ? 'Total Sent' : 'Total Value'}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{currencySymbol}{totals.sumAmount.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mb-0.5">Credits Applied</div>
                <div className="text-lg font-bold text-rose-500">-{currencySymbol}{totals.sumCredits.toLocaleString()}</div>
              </div>
              <div className="text-right pl-8 border-l border-slate-200 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-0.5">
                  {statusFilter === 'paid' ? 'Net Revenue' : 'Outstanding / Net'}
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{totals.net.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper Row Component
const InvoiceRow: React.FC<{ row: any, currencySymbol: string, indented?: boolean }> = ({ row, currencySymbol, indented }) => (
  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
    {indented && <td></td>}
    <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
      {row.id}
    </td>
    <td className="px-4 py-3">
      <div className="text-sm font-bold text-slate-900 dark:text-white">{row.client}</div>
      <div className="text-xs text-slate-400">{row.project || 'No Project'}</div>
    </td>
    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">
      {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
    </td>
    <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
      {currencySymbol}{row.amount.toLocaleString()}
    </td>
    <td className="px-4 py-3 text-center">
      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${row.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
        row.status === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' :
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
        {row.status}
      </span>
    </td>
    <td className="px-4 py-3 text-right text-sm font-bold text-rose-500">
      {row.appliedCredit > 0 ? `-${currencySymbol}${row.appliedCredit.toLocaleString()}` : '-'}
    </td>
    <td className="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
      {currencySymbol}{row.netRevenue.toLocaleString()}
    </td>
  </tr>
);

import { ChevronDown, ChevronUp } from 'lucide-react';

export default RevenueBreakdownModal;
