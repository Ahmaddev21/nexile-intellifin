import React, { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { ProjectCreate, Project } from '../types';
import { createProject, updateProject } from '../services/api';

interface AddProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingProject?: Project | null;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSuccess, editingProject }) => {
    const initialFormState: ProjectCreate = {
        name: '',
        client: '',
        budget: 0,
        expectedRevenue: 0,
        startDate: '',
        endDate: '',
        costCategories: [],
        status: 'active'
    };

    const [formData, setFormData] = useState<ProjectCreate>(initialFormState);

    // Populate form when editingProject changes
    React.useEffect(() => {
        if (editingProject) {
            setFormData({
                name: editingProject.name,
                client: editingProject.client || '',
                budget: editingProject.budget,
                expectedRevenue: editingProject.expectedRevenue || 0,
                // Ensure dates are formatted as YYYY-MM-DD for input[type="date"]
                startDate: editingProject.startDate ? editingProject.startDate.split('T')[0] : '',
                endDate: editingProject.endDate ? editingProject.endDate.split('T')[0] : '',
                costCategories: editingProject.costCategories || [],
                status: editingProject.status as any
            });
        } else {
            setFormData(initialFormState);
        }
        setError(null);
        setErrors({});
    }, [editingProject, isOpen]);

    const [newCategory, setNewCategory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.length < 3) {
            newErrors.name = 'Project name must be at least 3 characters';
        }
        if (!formData.client) {
            newErrors.client = 'Client name is required';
        }
        if (!formData.budget || formData.budget <= 0) {
            newErrors.budget = 'Budget must be a positive number';
        }
        if (!formData.expectedRevenue || formData.expectedRevenue <= 0) {
            newErrors.expectedRevenue = 'Expected revenue must be a positive number';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }
        if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
            newErrors.endDate = 'End date must be after start date';
        }
        if (formData.costCategories.length === 0) {
            newErrors.costCategories = 'Add at least one cost category';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            // DEBUG: Alert on validation failure
            // const currentErrors = validateForm() ? {} : errors; // errors state might not be updated immediately in this render cycle
            // Use a slight timeout or just alert generic message since we setErrors state
            alert('Form validation failed. Please check the fields in red.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (editingProject) {
                await updateProject(editingProject.id, formData);
            } else {
                await createProject(formData);
            }

            onSuccess();
            onClose();
            // Reset form
            setFormData(initialFormState);
        } catch (err: any) {
            console.error('Project save error:', err);
            let msg = err.message || `Failed to ${editingProject ? 'update' : 'create'} project`;

            if (msg.includes('Project not found or permission denied')) {
                msg = "Access Denied: You cannot edit this project because it belongs to a different user session. Please create a new project to test editing.";
            }

            setError(msg);
            alert(`Error: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addCategory = () => {
        if (newCategory.trim() && !formData.costCategories.includes(newCategory.trim())) {
            setFormData(prev => ({
                ...prev,
                costCategories: [...prev.costCategories, newCategory.trim()]
            }));
            setNewCategory('');
            setErrors(prev => ({ ...prev, costCategories: '' }));
        }
    };

    const removeCategory = (category: string) => {
        setFormData(prev => ({
            ...prev,
            costCategories: prev.costCategories.filter(c => c !== category)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 rounded-t-[3rem] flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">
                        {editingProject ? 'Edit Project' : 'Create New Project'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Project Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                            placeholder="e.g., Website Redesign"
                            disabled={isLoading}
                        />
                        {errors.name && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name}</p>}
                    </div>

                    {/* Client Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Client Name *
                        </label>
                        <input
                            type="text"
                            value={formData.client}
                            onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.client ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                            placeholder="e.g., Acme Corporation"
                            disabled={isLoading}
                        />
                        {errors.client && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.client}</p>}
                    </div>

                    {/* Budget and Expected Revenue */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Budget *
                            </label>
                            <input
                                type="number"
                                value={formData.budget || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.budget ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                                placeholder="50000"
                                disabled={isLoading}
                            />
                            {errors.budget && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.budget}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Expected Revenue *
                            </label>
                            <input
                                type="number"
                                value={formData.expectedRevenue || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, expectedRevenue: parseFloat(e.target.value) || 0 }))}
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.expectedRevenue ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                                placeholder="75000"
                                disabled={isLoading}
                            />
                            {errors.expectedRevenue && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.expectedRevenue}</p>}
                        </div>
                    </div>

                    {/* Start and End Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.startDate ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                                disabled={isLoading}
                            />
                            {errors.startDate && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.startDate}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.endDate ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white`}
                                disabled={isLoading}
                            />
                            {errors.endDate && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.endDate}</p>}
                        </div>
                    </div>

                    {/* Cost Categories */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Cost Categories *
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white"
                                placeholder="e.g., Labor, Materials, Software"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={addCategory}
                                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-colors flex items-center gap-2"
                                disabled={isLoading}
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.costCategories.map(category => (
                                <span
                                    key={category}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium"
                                >
                                    {category}
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(category)}
                                        className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        {errors.costCategories && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.costCategories}</p>}
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white cursor-pointer"
                            disabled={isLoading}
                        >
                            <option value="active">Active</option>
                            <option value="on-hold">On Hold</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {editingProject ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                editingProject ? 'Update Project' : 'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectModal;
