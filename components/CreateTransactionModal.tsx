import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, FileText, DollarSign, Tag, Clock, Building2, AlertOctagon } from 'lucide-react';

export type TransactionType = 'invoice' | 'expense' | 'payable' | 'credit_note';

interface CreateTransactionModalProps {
    type: TransactionType;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    editData?: any;
    onUpdate?: (id: string, data: any) => Promise<void>;
    projects?: any[];
    invoices?: any[];
    currencySymbol?: string;
}

const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({ type, isOpen, onClose, onSubmit, editData, onUpdate, projects = [], invoices = [], currencySymbol = '$' }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({
        clientName: '',
        vendorName: '',
        clientId: 'c-' + Math.floor(Math.random() * 1000),
        category: '',
        expType: 'variable',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        projectName: '',
        projectId: '',
        status: 'sent',
        reason: '',
        invoiceId: '',
        description: ''
    });

    useEffect(() => {
        if (editData && isOpen) {
            setFormData({
                ...editData,
                amount: editData.amount?.toString() || '',
                expType: editData.type || 'variable',
                // Keep existing status or default based on type
                status: editData.status || getDefaultStatus(type),
                date: editData.date ? editData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                dueDate: editData.dueDate ? editData.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
            });
        } else if (!editData && isOpen) {
            setFormData({
                clientName: '',
                vendorName: '',
                clientId: 'c-' + Math.floor(Math.random() * 1000),
                category: '',
                expType: 'variable',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                projectName: '',
                projectId: '',
                status: getDefaultStatus(type),
                reason: '',
                invoiceId: '',
                description: ''
            });
        }
    }, [editData, isOpen, type]);

    const getDefaultStatus = (t: TransactionType) => {
        switch (t) {
            case 'invoice': return 'sent';
            case 'expense': return 'paid';
            case 'payable': return 'draft';
            case 'credit_note': return 'draft';
            default: return 'draft';
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (Number(formData.amount) <= 0) {
            setError("Amount must be greater than zero");
            return;
        }

        setLoading(true);
        try {
            // Construct payload based on type
            let payload: any = {
                amount: Number(formData.amount),
                date: formData.date,
                status: formData.status
            };

            if (type === 'invoice') {
                payload = {
                    ...payload,
                    clientName: formData.clientName,
                    projectId: formData.projectId,  // Send projectId, not projectName
                    clientId: formData.clientId || 'c-gen',
                    customId: formData.customId
                };
            } else if (type === 'expense') {
                payload = {
                    ...payload,
                    category: formData.category,
                    type: formData.expType,
                    projectId: formData.projectId  // Send projectId, not projectName
                };
            } else if (type === 'payable') {
                payload = {
                    ...payload,
                    vendorName: formData.vendorName,
                    dueDate: formData.dueDate,
                    description: formData.description,
                    projectId: formData.projectId  // Send projectId, not projectName
                };
            } else if (type === 'credit_note') {
                // Validate required fields
                if (!formData.projectId) {
                    setError("Please select a project");
                    setLoading(false);
                    return;
                }
                if (!formData.invoiceId) {
                    setError("Please select an invoice");
                    setLoading(false);
                    return;
                }

                // Balance validation
                const selectedInv = invoices.find(i => i.id === formData.invoiceId);
                if (selectedInv && Number(formData.amount) > selectedInv.amount) {
                    setError(`Credit amount cannot exceed invoice total of ${currencySymbol}${selectedInv.amount.toLocaleString()}`);
                    setLoading(false);
                    return;
                }

                payload = {
                    amount: Number(formData.amount),
                    date: formData.date,
                    status: formData.status || 'applied', // Default to applied for new system
                    reason: formData.reason,
                    projectId: formData.projectId,
                    invoiceId: formData.invoiceId
                };
            }

            if (editData && onUpdate) {
                await onUpdate(editData.id, payload);
            } else {
                await onSubmit(payload);
            }
            onClose();
        } catch (error: any) {
            setError(error.message || "Failed to save transaction. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'invoice': return 'Invoice';
            case 'expense': return 'Expense';
            case 'payable': return 'Payable Invoice';
            case 'credit_note': return 'Credit Note';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                        {editData ? 'Edit' : 'New'} {getTitle()}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center animate-in fade-in zoom-in duration-200">
                            {error}
                        </div>
                    )}

                    {/* --- INVOICE FORM --- */}
                    {type === 'invoice' && (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Invoice ID (e.g. INV-001)"
                                    required
                                    value={formData.customId || ''}
                                    onChange={(e) => setFormData({ ...formData, customId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Client Name"
                                    required
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- EXPENSE FORM --- */}
                    {type === 'expense' && (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Category (e.g., Software, Rent)"
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, expType: 'variable' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${formData.expType === 'variable' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                    Variable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, expType: 'fixed' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${formData.expType === 'fixed' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                >
                                    Fixed
                                </button>
                            </div>

                        </div>
                    )}

                    {/* --- PAYABLE INVOICE FORM --- */}
                    {type === 'payable' && (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Vendor Name"
                                    required
                                    value={formData.vendorName}
                                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">Due Date</div>
                            </div>
                            <div className="relative group">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Description / Notes"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- CREDIT NOTE FORM (NEW) --- */}
                    {type === 'credit_note' && (
                        <div className="space-y-4">
                            <div className="relative group">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setFormData({
                                            ...formData,
                                            projectId: pid,
                                            invoiceId: '' // Reset invoice when project changes
                                        });
                                    }}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-50/50 appearance-none"
                                >
                                    <option value="">Select Project (Required)</option>
                                    {projects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative group">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <select
                                    value={formData.invoiceId}
                                    disabled={!formData.projectId}
                                    onChange={(e) => {
                                        const invId = e.target.value;
                                        const selectedInv = invoices.find(i => i.id === invId);
                                        setFormData({
                                            ...formData,
                                            invoiceId: invId,
                                            amount: selectedInv ? selectedInv.amount.toString() : formData.amount
                                        });
                                    }}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-50/50 appearance-none font-medium disabled:opacity-50"
                                >
                                    <option value="">{formData.projectId ? 'Select Invoice to Credit' : 'Choose a Project First'}</option>
                                    {invoices
                                        .filter((inv: any) => inv.projectId === formData.projectId)
                                        .map((inv: any) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.id.substring(0, 8)}... · {inv.clientName} · {currencySymbol}{inv.amount.toLocaleString()}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {formData.invoiceId && (
                                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl animate-in slide-in-from-top-2">
                                    <div className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1">Deducted Invoice</div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Total:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {currencySymbol}{invoices.find(i => i.id === formData.invoiceId)?.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <AlertOctagon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Reason for adjustment (optional)"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-50/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- SHARED AMOUNT / DATE --- */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="number"
                                placeholder="Amount"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                    </div>

                    {/* --- PROJECT (Shared for others) --- */}
                    {type !== 'credit_note' && (
                        <div className="relative group">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <select
                                value={formData.projectId}
                                onChange={(e) => {
                                    const pid = e.target.value;
                                    const pname = projects.find(p => p.id === pid)?.name || '';
                                    setFormData({ ...formData, projectId: pid, projectName: pname });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-50/50 appearance-none"
                            >
                                <option value="">Select Project (Optional)</option>
                                {projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : editData ? 'Update Transaction' : 'Create Transaction'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateTransactionModal;
