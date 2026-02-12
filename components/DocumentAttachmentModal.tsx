import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2, Eye, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadAttachment, getSignedAttachmentUrl } from '../services/api';
import { supabase } from '../lib/supabase';

interface DocumentAttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordId: string;
    recordType: 'invoices' | 'expenses' | 'payable_invoices' | 'credit_notes'; // Table names
    currentAttachmentUrl?: string;
    onUploadSuccess: (url: string) => void;
    readonly?: boolean;
}

const DocumentAttachmentModal: React.FC<DocumentAttachmentModalProps> = ({
    isOpen,
    onClose,
    recordId,
    recordType,
    currentAttachmentUrl,
    onUploadSuccess,
    readonly = false
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 200 * 1024) { // 200KB
            setError('File size must be less than 200KB');
            return;
        }
        if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            setError('Only PDF and JPG formats are allowed');
            return;
        }

        try {
            setIsUploading(true);
            setError(null);

            // 1. Upload to Storage
            // recordType map to storage folder name (singular usually better for folder, but sticking to plan)
            // Actually API expects 'recordType' to be part of path.
            // Let's use singular for path to be cleaner: 'invoice', 'expense' etc.
            const typeMap: Record<string, string> = {
                'invoices': 'invoice',
                'expenses': 'expense',
                'payable_invoices': 'payable',
                'credit_notes': 'credit_note'
            };

            const path = await uploadAttachment(file, typeMap[recordType] || 'misc', recordId);

            // 2. Update Record in DB
            // We need to update the specific table with the new attachment_url
            // We can do this here directly via supabase or add a specific API method.
            // Direct update here is faster for now.
            const { error: dbError } = await supabase
                .from(recordType) // Table name
                .update({ attachment_url: path })
                .eq('id', recordId);

            if (dbError) throw dbError;

            setSuccess(true);
            onUploadSuccess(path);

            // Auto close after success? Maybe not, let user see success.
        } catch (err: any) {
            console.error('Upload process failed:', err);
            setError(err.message || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to remove this attachment?')) return;

        try {
            setIsUploading(true);
            // 1. Remove from DB (set to null)
            const { error: dbError } = await supabase
                .from(recordType)
                .update({ attachment_url: null })
                .eq('id', recordId);

            if (dbError) throw dbError;

            // 2. (Optional) Delete from Storage - for now we can keep orphan files or clean up later.
            // Implementing delete from storage needs the path.

            onUploadSuccess(''); // Update parent UI to show no file
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete attachment');
            setIsUploading(false);
        }
    };

    const [signedUrl, setSignedUrl] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchUrl = async () => {
            if (currentAttachmentUrl) {
                const url = await getSignedAttachmentUrl(currentAttachmentUrl);
                setSignedUrl(url);
            } else {
                setSignedUrl(null);
            }
        };
        fetchUrl();
    }, [currentAttachmentUrl]);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Document Attachment
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {success && !currentAttachmentUrl && ( // Show success briefly before state update or if just uploaded
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Document uploaded successfully!
                        </div>
                    )}

                    {currentAttachmentUrl ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <FileText className="w-8 h-8 text-indigo-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                        Document Attached
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {currentAttachmentUrl.split('/').pop()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={signedUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                    <Eye className="w-4 h-4" /> View File
                                </a>
                                {!readonly && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={isUploading}
                                        className="flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                )}
                            </div>

                            {!readonly && (
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 mb-2">- OR -</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Replace Document
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-slate-900 dark:text-white font-bold mb-1">Upload Document</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 max-w-[200px] mx-auto">
                                PDF or JPG, max 200KB. Securely stored and linked to this record.
                            </p>

                            {!readonly ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isUploading ? (
                                        <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
                                    ) : 'Select File'}
                                </button>
                            ) : (
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm">
                                    No document uploaded.
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg"
                        onChange={handleFileSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default DocumentAttachmentModal;
