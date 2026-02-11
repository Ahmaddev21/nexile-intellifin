import React from 'react';
import { X, Download, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { Invoice, Expense, PayableInvoice, CreditNote, Company } from '../types';
import { generatePDF, generateExcel } from '../utils/documentGenerator';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: Invoice | Expense | PayableInvoice | CreditNote | null;
    type: 'invoice' | 'expense' | 'payable' | 'credit_note';
    company: Company;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, record, type, company }) => {
    if (!isOpen || !record) return null;

    const currency = company.currency || '$';

    const handleDownloadPDF = () => {
        generatePDF(record, type, company);
    };

    const handleDownloadExcel = () => {
        generateExcel(record, type);
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper to render status badge styled for document
    const StatusBadge = ({ status }: { status: string }) => {
        const s = status?.toUpperCase() || 'DRAFT';
        let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
        if (s === 'PAID') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (s === 'OVERDUE') colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
        else if (s === 'SENT') colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';

        return (
            <span className={`px-4 py-1.5 rounded border text-sm font-bold tracking-wider ${colorClass}`}>
                {s}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            Document View
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors hidden sm:flex"
                            title="Print"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                            <Download className="w-4 h-4" /> PDF
                        </button>
                        <button
                            onClick={handleDownloadExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Excel
                        </button>
                        <button
                            onClick={onClose}
                            className="ml-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Document Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950/50 print:bg-white print:p-0">
                    <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-12 max-w-3xl mx-auto min-h-[600px] print:shadow-none print:border-none print:w-full print:max-w-none">

                        {/* Document Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                    {company.name.toUpperCase()}
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {new Date().toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest mb-4">
                                    {type.replace('_', ' ')}
                                </h2>
                                <StatusBadge status={record.status} />
                            </div>
                        </div>

                        {/* Document Details Grid */}
                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                                    Billed To / Details
                                </h4>
                                {type === 'invoice' && (
                                    <>
                                        <div>
                                            <span className="block text-xs text-slate-400">Client</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{(record as Invoice).clientName}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400">Project</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{(record as Invoice).projectName}</span>
                                        </div>
                                    </>
                                )}
                                {type === 'expense' && (
                                    <>
                                        <div>
                                            <span className="block text-xs text-slate-400">Category</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{(record as Expense).category}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400">Project</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{(record as Expense).projectName}</span>
                                        </div>
                                    </>
                                )}
                                {type === 'payable' && (
                                    <>
                                        <div>
                                            <span className="block text-xs text-slate-400">Vendor</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{(record as PayableInvoice).vendorName}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400">Project</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{(record as PayableInvoice).projectName}</span>
                                        </div>
                                    </>
                                )}
                                {type === 'credit_note' && (
                                    <>
                                        <div>
                                            <span className="block text-xs text-slate-400">Invoice Ref</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{(record as CreditNote).invoiceId}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400">Reason</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{(record as CreditNote).reason}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4 text-right">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                                    Information
                                </h4>
                                <div>
                                    <span className="block text-xs text-slate-400">ID</span>
                                    <span className="font-mono text-slate-900 dark:text-white">{record.id}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-slate-400">Date</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {'date' in record ? record.date : 'createdAt' in record ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-2 border-slate-100 dark:border-slate-800 text-left">
                                    <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-widest pl-4">Description</th>
                                    <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right pr-4">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                <tr>
                                    <td className="py-6 pl-4">
                                        <div className="font-bold text-slate-900 dark:text-white mb-1">
                                            {type === 'invoice' ? (record as Invoice).projectName + ' Services' :
                                                type === 'expense' ? (record as Expense).category :
                                                    type === 'payable' ? ((record as PayableInvoice).description || 'Vendor Bill') :
                                                        (record as CreditNote).reason || 'Credit Adjustment'}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {type === 'invoice' ? 'Professional Services / Consulting' :
                                                type === 'expense' ? (record as Expense).type :
                                                    type === 'payable' ? `Due Date: ${(record as PayableInvoice).dueDate}` :
                                                        'Applied to project account'}
                                        </div>
                                    </td>
                                    <td className="py-6 pr-4 text-right font-bold text-slate-900 dark:text-white">
                                        {currency}{record.amount.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-900 dark:border-white">
                                    <td className="py-6 pl-4 font-black text-xl text-slate-900 dark:text-white uppercase">Total</td>
                                    <td className="py-6 pr-4 text-right font-black text-xl text-indigo-600 dark:text-indigo-400">
                                        {currency}{record.amount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Footer Notes */}
                        <div className="text-center pt-12 border-t border-slate-100 dark:border-slate-800">
                            <p className="font-serif italic text-slate-500 dark:text-slate-400 mb-2">
                                "Keep business halal."
                            </p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">
                                Generated by Intellifin Financial Systems
                            </p>
                        </div>

                    </div>
                </div>
            </div>
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white;
          }
        }
      `}</style>
        </div>
    );
};

export default DocumentViewerModal;
