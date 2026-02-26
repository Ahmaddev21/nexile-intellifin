import {
    FinancialData,
    ProjectFinancialDetail,
    Project,
    Invoice,
    Expense,
    PayableInvoice,
    CreditNote,
    Company,
    UserProgress,
    AuditLog
} from '../types';
import { supabase } from '../lib/supabase';
import { calculateProjectFinancials } from '../utils/financialCalculations';

// --- Helpers ---

const getUser = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.warn('Supabase auth check failed:', error);
        return null;
    }
};

const getCompanyId = async (): Promise<string | null> => {
    const user = await getUser();
    if (!user) return null;

    // Check if we have company_id in metadata (optimization)
    // For now, fetch from company_users table
    const { data, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

    if (error || !data) return null;
    return data.company_id;
};

const mapProject = (p: any): Project => ({
    id: p.id,
    name: p.name,
    client: p.client,
    budget: Number(p.budget),
    estimatedCost: Number(p.estimated_cost),
    expectedRevenue: Number(p.expected_revenue),
    startDate: p.start_date,
    endDate: p.end_date,
    costCategories: p.cost_categories || [],
    createdAt: p.created_at,
    firstActivityDate: p.first_activity_date,
    lastActivityDate: p.last_activity_date,
    status: p.status
});

const mapInvoice = (i: any, projectMap: Record<string, string> = {}): Invoice => ({
    id: i.id,
    customId: i.custom_id, // Map from DB
    clientId: i.client_id || 'unknown',
    clientName: i.client_name,
    projectId: i.project_id,
    projectName: projectMap[i.project_id] || 'Unknown',
    amount: Number(i.amount),
    date: i.date,
    status: i.status,
    attachment_url: i.attachment_url
});

const mapExpense = (e: any, projectMap: Record<string, string> = {}): Expense => ({
    id: e.id,
    category: e.category,
    projectId: e.project_id,
    projectName: projectMap[e.project_id] || 'Unknown',
    amount: Number(e.amount),
    date: e.date,
    type: e.type,
    status: e.status,
    attachment_url: e.attachment_url
});

const mapPayable = (p: any, projectMap: Record<string, string> = {}): PayableInvoice => ({
    id: p.id,
    vendorName: p.vendor_name,
    projectId: p.project_id,
    projectName: p.project_id ? (projectMap[p.project_id] || 'Unknown') : undefined,
    amount: Number(p.amount),
    date: p.date,
    dueDate: p.due_date,
    status: p.status,
    description: p.description,
    attachment_url: p.attachment_url
});

const mapCreditNote = (c: any): CreditNote => ({
    id: c.id,
    projectId: c.project_id,
    invoiceId: c.invoice_id,
    amount: Number(c.amount),
    reason: c.reason,
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    attachment_url: c.attachment_url
});

export const createInvoice = async (data: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { data: result, error } = await supabase.from('invoices').insert({
            user_id: user.id,
            company_id: companyId,
            project_id: data.projectId,
            client_name: data.clientName,
            amount: data.amount,
            date: data.date,
            status: data.status || 'sent',
            custom_id: data.customId // Save custom ID
        }).select().single();

        if (error) throw error;
        return mapInvoice(result);
    }
    throw new Error('User not authenticated or no company found');
};

export const updateInvoice = async (id: string, updates: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();
    if (user && companyId) {
        const dbUpdates: any = {};
        if (updates.amount) dbUpdates.amount = updates.amount;
        if (updates.date) dbUpdates.date = updates.date;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.clientName) dbUpdates.client_name = updates.clientName;
        if (updates.customId !== undefined) dbUpdates.custom_id = updates.customId; // Update custom ID

        const { data, error } = await supabase.from('invoices')
            .update(dbUpdates)
            .eq('id', id)
            .eq('company_id', companyId) // Filter by company
            .select().single();

        if (error) throw error;
        return mapInvoice(data);
    }
    throw new Error('User not authenticated');
};

export const deleteInvoice = async (invoiceId: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        let projectId: string | undefined;
        try {
            const { data: existing } = await supabase
                .from('invoices')
                .select('project_id')
                .eq('id', invoiceId)
                .eq('company_id', companyId)
                .single();
            projectId = existing?.project_id;
        } catch { }
        const { error } = await supabase.from('invoices')
            .delete()
            .eq('id', invoiceId)
            .eq('company_id', companyId);

        if (error) throw error;
        await updateProjectLastActivity(projectId);
        return { success: true };
    }
    throw new Error('User not authenticated');
};

// --- Expenses ---

export const fetchFilteredExpenses = async (startDate?: string, endDate?: string): Promise<Expense[]> => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        let query = supabase
            .from('expenses')
            .select('*')
            .eq('company_id', companyId)
            .order('date', { ascending: false });

        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Fetch projects for mapping names
        const projectIds = [...new Set((data || []).map(e => e.project_id).filter(Boolean))];
        const projectMap: Record<string, string> = {};
        if (projectIds.length > 0) {
            const { data: projects } = await supabase.from('projects').select('id, name').in('id', projectIds);
            (projects || []).forEach(p => projectMap[p.id] = p.name);
        }

        return (data || []).map(e => mapExpense(e, projectMap));
    }
    throw new Error('User not authenticated');
};

export const fetchExpenseSummary = async (startDate?: string, endDate?: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        // We'll call the RPC we just created.
        const { data, error } = await supabase.rpc('get_expense_summary', {
            p_company_id: companyId,
            p_start_date: startDate || null,
            p_end_date: endDate || null
        });

        if (error) {
            console.error('Error fetching expense summary via RPC:', error);
            // Fallback for if RPC doesn't exist yet: Calculate on client for now, but log the error
            console.log('Falling back to client-side aggregation for now.');
            const expenses = await fetchFilteredExpenses(startDate, endDate);
            const summaryMap: Record<string, number> = {};
            expenses.forEach(e => {
                summaryMap[e.category] = (summaryMap[e.category] || 0) + e.amount;
            });
            const summary = Object.keys(summaryMap).map(category => ({
                category,
                total_amount: summaryMap[category]
            })).sort((a, b) => b.total_amount - a.total_amount);
            return summary;
        }

        return data as { category: string; total_amount: number }[];
    }
    throw new Error('User not authenticated');
};

export const createExpense = async (expenseData: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { data, error } = await supabase.from('expenses').insert({
            user_id: user.id,
            company_id: companyId,
            category: expenseData.category,
            project_id: expenseData.projectId || null,
            amount: expenseData.amount,
            date: expenseData.date,
            type: expenseData.type || 'operational',
            status: expenseData.status || 'pending'
        }).select().single();

        if (error) throw error;
        await ensureProjectFirstActivity(expenseData.projectId, expenseData.date);
        await updateProjectLastActivity(expenseData.projectId);
        return mapExpense(data);
    }
    throw new Error('User not authenticated');
};

export const updateExpense = async (expenseId: string, updates: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const dbUpdates: any = {};
        if (updates.category) dbUpdates.category = updates.category;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
        if (updates.amount) dbUpdates.amount = updates.amount;
        if (updates.date) dbUpdates.date = updates.date;
        if (updates.status) dbUpdates.status = updates.status;

        const { data, error } = await supabase.from('expenses')
            .update(dbUpdates)
            .eq('id', expenseId)
            .eq('company_id', companyId)
            .select().single();

        if (error) throw error;
        await updateProjectLastActivity(updates.projectId || data?.project_id);
        return mapExpense(data);
    }
    throw new Error('User not authenticated');
};

export const deleteExpense = async (expenseId: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        let projectId: string | undefined;
        try {
            const { data: existing } = await supabase
                .from('expenses')
                .select('project_id')
                .eq('id', expenseId)
                .eq('company_id', companyId)
                .single();
            projectId = existing?.project_id;
        } catch { }
        const { error } = await supabase.from('expenses')
            .delete()
            .eq('id', expenseId)
            .eq('company_id', companyId);

        if (error) throw error;
        await updateProjectLastActivity(projectId);
        return { success: true };
    }
    throw new Error('User not authenticated');
};

// --- Payable Invoices ---

export const createPayableInvoice = async (payableData: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { data, error } = await supabase.from('payable_invoices').insert({
            user_id: user.id,
            company_id: companyId,
            vendor_name: payableData.vendorName,
            project_id: payableData.projectId || null,
            amount: payableData.amount,
            date: payableData.date,
            due_date: payableData.dueDate,
            status: payableData.status || 'pending',
            description: payableData.description
        }).select().single();

        if (error) throw error;
        await ensureProjectFirstActivity(payableData.projectId, payableData.date);
        await updateProjectLastActivity(payableData.projectId);
        return mapPayable(data);
    }
    throw new Error('User not authenticated');
};

export const updatePayableInvoice = async (id: string, updates: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const dbUpdates: any = {};
        if (updates.vendorName) dbUpdates.vendor_name = updates.vendorName;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
        if (updates.amount) dbUpdates.amount = updates.amount;
        if (updates.date) dbUpdates.date = updates.date;
        if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.description) dbUpdates.description = updates.description;

        const { data, error } = await supabase.from('payable_invoices')
            .update(dbUpdates)
            .eq('id', id)
            .eq('company_id', companyId)
            .select().single();

        if (error) throw error;
        await updateProjectLastActivity(updates.projectId || data?.project_id);
        return mapPayable(data);
    }
    throw new Error('User not authenticated');
};

export const deletePayableInvoice = async (id: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        let projectId: string | undefined;
        try {
            const { data: existing } = await supabase
                .from('payable_invoices')
                .select('project_id')
                .eq('id', id)
                .eq('company_id', companyId)
                .single();
            projectId = existing?.project_id;
        } catch { }
        const { error } = await supabase.from('payable_invoices')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);

        if (error) throw error;
        await updateProjectLastActivity(projectId);
        return { success: true };
    }
    throw new Error('User not authenticated');
};

// --- Credit Notes ---

export const fetchCreditNotes = async (): Promise<CreditNote[]> => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { data, error } = await supabase
            .from('credit_notes')
            .select('*')
            .eq('company_id', companyId);
        if (error) throw error;
        return (data || []).map(mapCreditNote);
    }
    throw new Error('User not authenticated');
};

export const createCreditNote = async (data: Partial<CreditNote>) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        if (!data.invoiceId) throw new Error('Invoice ID is required');
        if (!data.projectId) throw new Error('Project ID is required');
        if (!data.amount || data.amount <= 0) throw new Error('Valid amount is required');

        const { data: result, error } = await supabase
            .from('credit_notes')
            .insert({
                user_id: user.id,
                company_id: companyId,
                invoice_id: data.invoiceId,
                project_id: data.projectId,
                amount: data.amount,
                reason: data.reason || '',
                status: data.status || 'applied'
            })
            .select()
            .single();

        if (error) throw error;
        return mapCreditNote(result);
    }
    throw new Error('User not authenticated');
};

export const updateCreditNote = async (id: string, updates: Partial<CreditNote>) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const dbUpdates: any = {};
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { data, error } = await supabase
            .from('credit_notes')
            .update(dbUpdates)
            .eq('id', id)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) throw error;
        return mapCreditNote(data);
    }
    throw new Error('User not authenticated');
};

export const deleteCreditNote = async (id: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { error } = await supabase
            .from('credit_notes')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);

        if (error) throw error;
        return { success: true };
    }
    throw new Error('User not authenticated');
};

// --- Gamification ---

export const getLeaderboard = async (): Promise<{ userId: string; username: string; points: number; rank: number }[]> => {
    const { data, error } = await supabase.rpc('get_company_leaderboard');
    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
    return data.map((item: any) => ({
        userId: item.user_id,
        username: item.username || 'Unknown',
        points: item.points,
        rank: item.rank
    }));
};

export const incrementPoints = async (amount: number): Promise<void> => {
    const { error } = await supabase.rpc('increment_user_points', { p_points: amount });
    if (error) console.error('Error incrementing points:', error);
};

export const fetchUserProgress = async (userId: string): Promise<UserProgress | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('points, level, badges, achievements')
        .eq('id', userId)
        .single();

    if (error) {
        return null;
    }

    return {
        points: data.points || 0,
        level: data.level || 1,
        nextLevelPoints: (data.level || 1) * 1000,
        badges: data.badges || [],
        streaks: 0
    };
};

// --- Projects ---

export const fetchMonthlyAnalytics = async () => {
    return [];
};

export const updateProject = async (projectId: string, updates: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.client !== undefined) dbUpdates.client = updates.client;
        if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
        if (updates.expectedRevenue !== undefined) dbUpdates.expected_revenue = updates.expectedRevenue;

        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        if (updates.costCategories !== undefined) dbUpdates.cost_categories = updates.costCategories;

        const { data, error } = await supabase.from('projects')
            .update(dbUpdates)
            .eq('id', projectId)
            .eq('company_id', companyId)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.error('Update returned no rows - potential RLS or ID mismatch', { projectId, userId: user.id });
            throw new Error('Project not found or permission denied');
        }

        return mapProject(data[0]);
    }
    throw new Error('User not authenticated');
};

export const deleteProject = async (projectId: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { error } = await supabase.from('projects')
            .delete()
            .eq('id', projectId)
            .eq('company_id', companyId);

        if (error) throw error;
        return { success: true };
    }
    throw new Error('User not authenticated');
};

export const createProject = async (projectData: any) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        const { data, error } = await supabase.from('projects').insert({
            user_id: user.id,
            company_id: companyId,
            name: projectData.name,
            client: projectData.client,
            budget: projectData.budget,
            estimated_cost: projectData.estimatedCost, // Note: AddProjectModal doesn't set this, it sets expectedRevenue
            expected_revenue: projectData.expectedRevenue,
            start_date: projectData.startDate,
            end_date: projectData.endDate,
            cost_categories: projectData.costCategories,
            status: projectData.status || 'active'
        }).select().single();

        if (error) throw error;
        return mapProject(data);
    }
    throw new Error('User not authenticated');
};

// --- Project Detail (CRITICAL FIX) ---

export const fetchProjectDetail = async (projectId: string): Promise<ProjectFinancialDetail> => {
    const user = await getUser();
    const companyId = await getCompanyId();

    let project, invoices, expenses, payables, credits;

    if (user && companyId) {
        try {
            const [p, i, e, pay, cr] = await Promise.all([
                supabase.from('projects').select('*').eq('id', projectId).eq('company_id', companyId).single(),
                supabase.from('invoices').select('*').eq('project_id', projectId).eq('company_id', companyId),
                supabase.from('expenses').select('*').eq('project_id', projectId).eq('company_id', companyId),
                supabase.from('payable_invoices').select('*').eq('project_id', projectId).eq('company_id', companyId),
                supabase.from('credit_notes').select('*').eq('project_id', projectId).eq('company_id', companyId)
            ]);

            if (p.data) {
                project = mapProject(p.data);
                const projectMap = { [project.id]: project.name };
                invoices = (i.data || []).map(item => mapInvoice(item, projectMap));
                expenses = (e.data || []).map(item => mapExpense(item, projectMap));
                payables = (pay.data || []).map(item => mapPayable(item, projectMap));
                credits = (cr.data || []).map(item => mapCreditNote(item));
            }
        } catch (err) {
            console.error('Supabase project detail fetch failed:', err);
        }
    }

    if (!project) throw new Error('Project not found');

    // Use unified calculation logic
    return calculateProjectFinancials(
        project,
        invoices || [],
        expenses || [],
        payables || [],
        credits || []
    );
};

// --- Core Fetching ---

export const fetchFinancialData = async (): Promise<FinancialData> => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (user && companyId) {
        try {
            const [projects, invoices, expenses, payables, credits] = await Promise.all([
                supabase.from('projects').select('*').eq('company_id', companyId),
                supabase.from('invoices').select('*').eq('company_id', companyId),
                supabase.from('expenses').select('*').eq('company_id', companyId),
                supabase.from('payable_invoices').select('*').eq('company_id', companyId),
                supabase.from('credit_notes').select('*').eq('company_id', companyId)
            ]);

            // Create project map
            const projectMap: Record<string, string> = {};
            (projects.data || []).forEach((p: any) => {
                projectMap[p.id] = p.name;
            });

            return {
                projects: (projects.data || []).map(mapProject),
                invoices: (invoices.data || []).map(i => mapInvoice(i, projectMap)),
                expenses: (expenses.data || []).map(e => mapExpense(e, projectMap)),
                payableInvoices: (payables.data || []).map(p => mapPayable(p, projectMap)),
                creditNotes: (credits.data || []).map(mapCreditNote)
            };
        } catch (error) {
            throw error;
        }
    }

    throw new Error('User not authenticated or Company not found');
};

// --- Project Activity Helper ---
const updateProjectLastActivity = async (projectId?: string) => {
    if (!projectId) return;
    const companyId = await getCompanyId();
    const nowIso = new Date().toISOString();
    if (companyId) {
        try {
            await supabase
                .from('projects')
                .update({ last_activity_date: nowIso })
                .eq('id', projectId)
                .eq('company_id', companyId);
        } catch (err) {
            console.warn('Failed to update last activity date:', err);
        }
        return;
    }
};

const ensureProjectFirstActivity = async (projectId?: string, activityDateIso?: string) => {
    if (!projectId || !activityDateIso) return;
    const companyId = await getCompanyId();
    if (companyId) {
        try {
            await supabase
                .from('projects')
                .update({ first_activity_date: activityDateIso })
                .eq('id', projectId)
                .eq('company_id', companyId)
                .is('first_activity_date', null);
        } catch (err) {
            console.warn('Failed to set first activity date:', err);
        }
        return;
    }
};

export const fetchCompany = async (explicitUserId?: string) => {
    let user = null;
    if (explicitUserId) {
        user = { id: explicitUserId };
    } else {
        user = await getUser();
    }

    if (user) {
        // Method 1: Fetch via company_users to get the linked company (standard way)
        const { data } = await supabase
            .from('company_users')
            .select('company:companies(*)')
            .eq('user_id', user.id)
            .single();

        if (data && data.company) {
            const co = Array.isArray(data.company) ? data.company[0] : data.company;
            if (co) return mapCompany(co);
        }

        // Method 2: Fallback - Check if user owns a company directly (for onboarding race conditions)
        const { data: ownCompany } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (ownCompany) {
            return mapCompany(ownCompany);
        }
    }
    return null;
};

const mapCompany = (co: any) => ({
    name: co.name,
    industry: co.industry,
    currency: co.currency,
    fiscalYearStart: co.fiscal_year_start || co.fiscalYearStart || 'January',
    joinCode: co.join_code,
    id: co.id
});

export const getUserRole = async (userId: string) => {
    const { data } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', userId)
        .single();

    return data?.role as 'admin' | 'member' | undefined;
};

export const updateCompany = async (companyData: any, explicitUserId?: string) => {
    let user = null;
    if (explicitUserId) {
        user = { id: explicitUserId };
    } else {
        user = await getUser();
    }

    // If we have an explicit user ID, we might not be able to get companyId from company_users table via RLS easily
    // So we need to be careful. Ideally we should trust the company ID in the companyData if provided, or fetch it.

    // For onboarding, the user IS the owner, so we can try to find the company owned by them
    let companyId = await getCompanyId();

    if (!companyId && user) {
        // Fallback: Find company owned by this user
        const { data } = await supabase.from('companies').select('id').eq('user_id', user.id).single();
        if (data) companyId = data.id;
    }

    if (user && companyId) {
        // Update company
        const { data, error } = await supabase.from('companies').update({
            name: companyData.name,
            industry: companyData.industry,
            currency: companyData.currency,
            fiscal_year_start: companyData.fiscalYearStart || 'January'
        })
            .eq('id', companyId) // Filter by company ID
            .select().single();

        if (!error && data) {
            return {
                name: data.name,
                industry: data.industry,
                currency: data.currency,
                fiscalYearStart: data.fiscal_year_start || 'January',
                joinCode: data.join_code,
                id: data.id
            };
        }
    }
    throw new Error('User not authenticated');
};

export const regenerateJoinCode = async () => {
    const { data, error } = await supabase.rpc('regenerate_join_code');
    if (error) throw error;
    return data as string;
};

// --- Audit Logs ---

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    const companyId = await getCompanyId();
    if (!companyId) throw new Error('User not authenticated or no company found');

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false });

    if (error) throw error;

    // Fetch all unique user IDs to get usernames
    const userIds = [...new Set((data || []).map((l: any) => l.performed_by).filter(Boolean))];
    const profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

        (profiles || []).forEach((p: any) => {
            profileMap[p.id] = p.username || 'Unknown';
        });
    }

    return (data || []).map((log: any) => ({
        id: log.id,
        tableName: log.table_name,
        recordId: log.record_id,
        action: log.action,
        oldData: log.old_data,
        newData: log.new_data,
        performedBy: log.performed_by,
        userName: profileMap[log.performed_by] || 'Unknown',
        timestamp: log.timestamp,
        companyId: log.company_id
    }));
};

// --- Storage / Attachments ---

export const getSignedAttachmentUrl = async (path: string) => {
    if (!path) return null;
    const { data, error } = await supabase.storage
        .from('finance_attachments')
        .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
        console.error('Error creating signed URL:', error);
        return null;
    }
    return data.signedUrl;
};

export const uploadAttachment = async (file: File, recordType: string, recordId: string) => {
    const user = await getUser();
    const companyId = await getCompanyId();

    if (!user || !companyId) throw new Error('Authentication required');

    // Path structure: {companyId}/{recordType}/{recordId}/{timestamp}_{filename}
    // Sanitizing filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${companyId}/${recordType}/${recordId}/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage
        .from('finance_attachments')
        .upload(path, file);

    if (error) {
        console.error('Upload failed:', error);
        throw error;
    }

    return path; // Store the relative path in DB
};
