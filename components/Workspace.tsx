import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Filter, Download, MoreVertical, CheckCircle2, AlertCircle, Clock, Tag, Trash2, Edit3, Send, Ban, CheckSquare, Loader2 } from 'lucide-react';
import { FinancialData, FinancialStatus } from '../types';
import { updateInvoice, deleteInvoice, updateExpense, deleteExpense, updatePayableInvoice, deletePayableInvoice } from '../services/api';

interface WorkspaceProps {
  data: FinancialData;
  currencySymbol: string;
  onCategorize?: (expenseId: string, event: React.MouseEvent) => void;
  onAddInvoice: () => void;
  onAddExpense: () => void;
  onAddPayable: () => void;
  onAddCreditNote: () => void;
  onEditInvoice?: (invoice: any) => void;
  onEditExpense?: (expense: any) => void;
  onEditPayable?: (payable: any) => void;
  onEditCreditNote?: (creditNote: any) => void;
  onDataRefresh: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ data, currencySymbol, onCategorize, onAddInvoice, onAddExpense, onAddPayable, onAddCreditNote, onEditInvoice, onEditExpense, onEditPayable, onEditCreditNote, onDataRefresh }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'payables' | 'credit_notes'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorizedIds, setCategorizedIds] = useState<Set<string>>(new Set());

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredInvoices = data.invoices.filter(inv =>
    inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpenses = data.expenses.filter(exp =>
    exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayables = (data.payableInvoices || []).filter(pay =>
    pay.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pay.projectName && pay.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCreditNotes = (data.creditNotes || []).filter(cn =>
    (cn.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cn.invoiceId && cn.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Helper to get credits for an invoice
  const getInvoiceCredits = (invoiceId: string) => {
    return (data.creditNotes || [])
      .filter(cn => cn.invoiceId === invoiceId && cn.status === 'applied')
      .reduce((sum, cn) => sum + cn.amount, 0);
  };

  const handleCategorizeClick = (expenseId: string, e: React.MouseEvent) => {
    if (!categorizedIds.has(expenseId)) {
      setCategorizedIds(prev => new Set(prev).add(expenseId));
      onCategorize?.(expenseId, e);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, status: FinancialStatus) => {
    setIsProcessing(invoiceId);
    try {
      await updateInvoice(invoiceId, { status });
      onDataRefresh();
      setActiveMenuId(null);
    } catch (error: any) {
      alert(`Update failed: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    // Check for linked credit notes
    const linkedCreditNotes = (data.creditNotes || []).filter(cn => cn.invoiceId === invoiceId);

    if (linkedCreditNotes.length > 0) {
      alert(`Cannot delete invoice: There are ${linkedCreditNotes.length} credit notes linked to this invoice. Please delete or unlink them first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;

    setIsProcessing(invoiceId);
    try {
      await deleteInvoice(invoiceId);
      onDataRefresh();
      setActiveMenuId(null);
    } catch (error: any) {
      alert(`Deletion failed: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePayableAction = async (id: string, action: 'delete' | 'status', payload?: any) => {
    setIsProcessing(id);
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this payable invoice?')) return;
        await deletePayableInvoice(id);
      } else {
        await updatePayableInvoice(id, { status: payload });
      }
      onDataRefresh();
      setActiveMenuId(null);
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCreditNoteAction = async (id: string, action: 'delete' | 'status', payload?: any) => {
    setIsProcessing(id);
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this credit note?')) return;
        const { deleteCreditNote } = await import('../services/api');
        await deleteCreditNote(id);
      } else {
        const { updateCreditNote } = await import('../services/api');
        await updateCreditNote(id, { status: payload });
      }
      onDataRefresh();
      setActiveMenuId(null);
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('payables')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'payables' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Payables
          </button>
          <button
            onClick={() => setActiveTab('credit_notes')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'credit_notes' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Credit Notes
          </button>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 w-full sm:w-64 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'invoices') onAddInvoice();
              else if (activeTab === 'expenses') onAddExpense();
              else if (activeTab === 'payables') onAddPayable();
              else onAddCreditNote();
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-bold text-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add {activeTab === 'invoices' ? 'Invoice' : activeTab === 'expenses' ? 'Expense' : activeTab === 'payables' ? 'Bill' : 'Credit Note'}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] overflow-visible shadow-sm border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Project</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {activeTab === 'expenses' ? 'Category' : activeTab === 'payables' ? 'Vendor' : 'Client Name'}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
              {activeTab !== 'expenses' && (
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status/Action</th>
              )}
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeTab === 'invoices' ? (
              filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      {inv.projectName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{inv.clientName}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">ID: {inv.customId || inv.id.substring(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{currencySymbol}{inv.amount.toLocaleString()}</div>
                    {getInvoiceCredits(inv.id) > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Net: {currencySymbol}{(inv.amount - getInvoiceCredits(inv.id)).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{inv.date}</td>
                  <td className="px-6 py-4">
                    {isProcessing === inv.id ? (
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                      </div>
                    ) : (
                      <StatusBadge status={inv.status} />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === inv.id ? null : inv.id)}
                      className={`transition-all p-2 rounded-xl ${activeMenuId === inv.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {activeMenuId === inv.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-6 top-14 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                      >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Change Status</div>
                        <div className="grid grid-cols-1 gap-1">
                          <ActionItem icon={<Clock className="w-4 h-4" />} label="Set to Draft" onClick={() => handleStatusUpdate(inv.id, 'draft')} active={inv.status === 'draft'} />
                          <ActionItem icon={<Send className="w-4 h-4" />} label="Mark as Sent" onClick={() => handleStatusUpdate(inv.id, 'sent')} active={inv.status === 'sent'} />
                          <ActionItem icon={<CheckSquare className="w-4 h-4 text-emerald-500" />} label="Mark as Paid" onClick={() => handleStatusUpdate(inv.id, 'paid')} active={inv.status === 'paid'} />
                          <ActionItem icon={<AlertCircle className="w-4 h-4 text-rose-500" />} label="Mark Overdue" onClick={() => handleStatusUpdate(inv.id, 'overdue')} active={inv.status === 'overdue'} />
                          <ActionItem icon={<Ban className="w-4 h-4" />} label="Cancel Invoice" onClick={() => handleStatusUpdate(inv.id, 'cancelled')} active={inv.status === 'cancelled'} />
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                        <div className="grid grid-cols-1 gap-1">
                          <ActionItem icon={<Edit3 className="w-4 h-4" />} label="Edit Details" onClick={() => { onEditInvoice?.(inv); setActiveMenuId(null); }} />
                          <ActionItem icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete Invoice" onClick={() => handleDelete(inv.id)} variant="danger" />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : activeTab === 'expenses' ? (
              filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      {exp.projectName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{exp.category}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">ID: {exp.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{currencySymbol}{exp.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{exp.date}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === exp.id ? null : exp.id)}
                      className={`transition-all p-2 rounded-xl ${activeMenuId === exp.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeMenuId === exp.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-6 top-14 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                      >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Actions</div>
                        <div className="grid grid-cols-1 gap-1">
                          <ActionItem icon={<Edit3 className="w-4 h-4" />} label="Edit Details" onClick={() => { onEditExpense?.(exp); setActiveMenuId(null); }} />
                          <ActionItem icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete Expense" onClick={() => {
                            if (window.confirm('Delete this expense?')) {
                              deleteExpense(exp.id).then(onDataRefresh);
                            }
                          }} variant="danger" />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : activeTab === 'payables' ? (
              filteredPayables.map((pay: any) => (
                <tr key={pay.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{pay.vendorName}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">Due: {pay.dueDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      {pay.projectName || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white text-amber-600 dark:text-amber-400">{currencySymbol}{pay.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{pay.date}</td>
                  <td className="px-6 py-4">
                    {isProcessing === pay.id ? (
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                      </div>
                    ) : (
                      <StatusBadge status={pay.status} />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === pay.id ? null : pay.id)}
                      className="text-slate-300 dark:text-slate-600 hover:text-indigo-600 transition-colors p-1"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeMenuId === pay.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-6 top-14 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                      >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Actions</div>
                        <div className="grid grid-cols-1 gap-1">
                          <ActionItem icon={<CheckSquare className="w-4 h-4 text-emerald-500" />} label="Mark Paid" onClick={() => handlePayableAction(pay.id, 'status', 'paid')} active={pay.status === 'paid'} />
                          <ActionItem icon={<AlertCircle className="w-4 h-4 text-rose-500" />} label="Mark Overdue" onClick={() => handlePayableAction(pay.id, 'status', 'overdue')} active={pay.status === 'overdue'} />
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                          <ActionItem icon={<Edit3 className="w-4 h-4" />} label="Edit" onClick={() => { onEditPayable?.(pay); setActiveMenuId(null); }} />
                          <ActionItem icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete" onClick={() => handlePayableAction(pay.id, 'delete')} variant="danger" />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              filteredCreditNotes.map((cn: any) => (
                <tr key={cn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{cn.reason || 'No Reason'}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">Invoice: {cn.invoiceId?.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      {data.projects.find(p => p.id === cn.projectId)?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-rose-500">-{currencySymbol}{cn.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(cn.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {isProcessing === cn.id ? (
                      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ring-1 ${cn.status === 'applied' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' : 'bg-slate-100 text-slate-500 ring-slate-400/20'}`}>
                        {cn.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === cn.id ? null : cn.id)}
                      className="text-slate-300 dark:text-slate-600 hover:text-indigo-600 transition-colors p-1"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeMenuId === cn.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-6 top-14 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                      >
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Actions</div>
                        <div className="grid grid-cols-1 gap-1">
                          <ActionItem icon={<CheckSquare className="w-4 h-4 text-emerald-500" />} label="Set Applied" onClick={() => handleCreditNoteAction(cn.id, 'status', 'applied')} active={cn.status === 'applied'} />
                          <ActionItem icon={<Ban className="w-4 h-4" />} label="Void Credit" onClick={() => handleCreditNoteAction(cn.id, 'status', 'void')} active={cn.status === 'void'} />
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                          <ActionItem icon={<Edit3 className="w-4 h-4" />} label="Edit" onClick={() => { onEditCreditNote?.(cn); setActiveMenuId(null); }} />
                          <ActionItem icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete" onClick={() => handleCreditNoteAction(cn.id, 'delete')} variant="danger" />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {(activeTab === 'invoices' ? filteredInvoices : activeTab === 'expenses' ? filteredExpenses : activeTab === 'payables' ? filteredPayables : filteredCreditNotes).length === 0 && (
          <div className="p-12 text-center">
            <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white">No results found</h4>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6">
        <div className="text-sm text-slate-400 dark:text-slate-500">
          Showing <strong>{(activeTab === 'invoices' ? filteredInvoices : activeTab === 'expenses' ? filteredExpenses : activeTab === 'payables' ? filteredPayables : filteredCreditNotes).length}</strong> entries
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Previous</button>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
};

const ActionItem: React.FC<{
  icon: React.ReactNode,
  label: string,
  onClick: () => void,
  variant?: 'default' | 'danger',
  active?: boolean
}> = ({ icon, label, onClick, variant = 'default', active }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-2 text-sm font-bold rounded-2xl transition-all ${active
      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
      : variant === 'danger'
        ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
  >
    {icon}
    {label}
    {active && <CheckCircle2 className="w-3 h-3 ml-auto text-indigo-600" />}
  </button>
);

const StatusBadge: React.FC<{ status: FinancialStatus }> = ({ status }) => {
  switch (status) {
    case 'paid':
      return (
        <span className="flex items-center gap-1.5 w-fit px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold ring-1 ring-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> PAID
        </span>
      );
    case 'sent':
      return (
        <span className="flex items-center gap-1.5 w-fit px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold ring-1 ring-indigo-500/20">
          <Send className="w-3 h-3" /> SENT
        </span>
      );
    case 'overdue':
      return (
        <span className="flex items-center gap-1.5 w-fit px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-bold ring-1 ring-rose-500/20">
          <AlertCircle className="w-3 h-3" /> OVERDUE
        </span>
      );
    case 'cancelled':
      return (
        <span className="flex items-center gap-1.5 w-fit px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full text-[10px] font-bold ring-1 ring-slate-400/20">
          <Ban className="w-3 h-3" /> CANCELLED
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 w-fit px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold ring-1 ring-amber-500/20">
          <Clock className="w-3 h-3" /> DRAFT
        </span>
      );
  }
};

export default Workspace;
