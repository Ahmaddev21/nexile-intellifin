import './env.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Project, Invoice, Expense, User, Company } from './models.js';
import { authenticateToken } from './middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexile-intelligent-finance-secret-2026';

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexile-intellifin';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Fail after 5 seconds instead of hanging
})
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => {
        console.error('CRITICAL: MongoDB connection error:', err.message);
        process.exit(1); // Exit if initial connection fails
    });

mongoose.connection.on('error', err => {
    console.error('MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Please check if the database is running.');
});

// Basic Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running', version: '1.2.4' });
});

// AUTH ROUTES
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        // Initialize empty company for new user
        const company = new Company({
            userId: user._id,
            name: `${username}'s Workspace`,
            currency: 'USD',
            fiscalYearStart: 'January'
        });
        await company.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email }, company });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                error: `User with this ${field} already exists. Please login instead.`
            });
        }
        res.status(500).json({ error: 'Error creating user', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const company = await Company.findOne({ userId: user._id });

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user._id, username: user.username, email: user.email }, company });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in', details: error.message });
    }
});

// AUTH ROUTES
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});
app.get('/api/company', authenticateToken, async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.userId });
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch company settings' });
    }
});

app.post('/api/company', authenticateToken, async (req, res) => {
    try {
        const company = await Company.findOneAndUpdate(
            { userId: req.user.userId },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});

// POST Create Invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
        const { clientId, clientName, projectId, projectName, amount, date, status } = req.body;
        if (!clientId || !amount || !date) return res.status(400).json({ error: 'Missing required fields' });

        const newInvoice = new Invoice({
            id: `inv-${Date.now()}`,
            clientId,
            clientName,
            projectId,
            projectName,
            amount: Number(amount),
            date,
            status,
            userId: req.user.userId // Added userId
        });

        await newInvoice.save();
        res.status(201).json(newInvoice);
    } catch (error) {
        console.error('Invoice creation error:', error);
        res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
});

// PATCH Update Invoice
app.patch('/api/invoices/:id', authenticateToken, async (req, res) => {
    const { id: paramId } = req.params;
    const userId = req.user.userId;

    try {
        const updates = req.body;
        // Clean updates
        delete updates.id;
        delete updates._id;
        delete updates.userId;

        // Try exact match first
        let invoice = await Invoice.findOneAndUpdate(
            { id: paramId, userId: userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        // Fallback for debugging: if not found by userId, check if it exists at all
        if (!invoice) {
            const exists = await Invoice.findOne({ id: paramId });
            if (exists) {
                console.warn(`[DEBUG] Invoice ${paramId} exists but owned by ${exists.userId}, not ${userId}`);
                return res.status(403).json({
                    error: 'Unauthorized',
                    details: 'This invoice belongs to another user.'
                });
            }
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        console.error('[DEBUG] PATCH error:', error);
        res.status(500).json({
            error: 'Failed to update invoice',
            details: error.message
        });
    }
});

// PUT Update Invoice (Fallback)
app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const { id, _id, userId, ...updates } = req.body;
        const invoice = await Invoice.findOneAndUpdate(
            { id: req.params.id, userId: req.user.userId },
            { $set: updates },
            { new: true, runValidators: true, context: 'query' }
        );
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update invoice', details: error.message });
    }
});

// PATCH Update Expense
app.patch('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id, _id, userId, ...updates } = req.body;
        const expense = await Expense.findOneAndUpdate(
            { id: req.params.id, userId: req.user.userId },
            { $set: updates },
            { new: true, runValidators: true, context: 'query' }
        );
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        res.json(expense);
    } catch (error) {
        console.error('Expense update error:', error);
        res.status(500).json({ error: 'Failed to update expense', details: error.message });
    }
});

// DELETE Invoice
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const result = await Invoice.findOneAndDelete({ id: req.params.id, userId: req.user.userId });
        if (!result) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Invoice deletion error:', error);
        res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
    }
});

// POST Create Expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const { category, projectId, projectName, amount, date, type } = req.body;
        if (!category || !amount || !date) return res.status(400).json({ error: 'Missing required fields' });

        const newExpense = new Expense({
            id: `exp-${Date.now()}`,
            category,
            projectId,
            projectName,
            amount: Number(amount),
            date,
            type,
            userId: req.user.userId // Added userId
        });

        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Expense creation error:', error);
        res.status(500).json({ error: 'Failed to create expense', details: error.message });
    }
});

// GET Monthly Analytics with MoM Comparisons
app.get('/api/analytics/monthly', authenticateToken, async (req, res) => {
    try {
        const [invoices, expenses] = await Promise.all([
            Invoice.find({ userId: req.user.userId }), // Scoped to user
            Expense.find({ userId: req.user.userId })  // Scoped to user
        ]);

        const monthlyData = {};
        invoices.forEach(inv => {
            if (inv.status === 'paid') {
                const date = new Date(inv.date);
                if (isNaN(date)) return;
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0 };
                monthlyData[monthKey].revenue += inv.amount;
            }
        });

        expenses.forEach(exp => {
            const date = new Date(exp.date);
            if (isNaN(date)) return;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0 };
            monthlyData[monthKey].expenses += exp.amount;
        });

        const monthlyArray = Object.keys(monthlyData)
            .sort()
            .map(month => {
                const data = monthlyData[month];
                const netProfit = data.revenue - data.expenses;
                const profitMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
                return {
                    month,
                    revenue: data.revenue,
                    expenses: data.expenses,
                    netProfit,
                    profitMargin: parseFloat(profitMargin.toFixed(2))
                };
            });

        const monthlyWithComparisons = monthlyArray.map((current, index) => {
            if (index === 0) return current;
            const previous = monthlyArray[index - 1];
            const calculateChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : parseFloat((((curr - prev) / prev) * 100).toFixed(2));
            return {
                ...current,
                revenueChange: calculateChange(current.revenue, previous.revenue),
                expensesChange: calculateChange(current.expenses, previous.expenses),
                profitChange: calculateChange(current.netProfit, previous.netProfit),
                marginChange: parseFloat((current.profitMargin - previous.profitMargin).toFixed(2))
            };
        });

        res.json(monthlyWithComparisons);
    } catch (error) {
        console.error('Error fetching monthly analytics:', error);
        res.status(500).json({ error: 'Failed to fetch monthly analytics' });
    }
});

// GET Project Financial Detail
app.get('/api/analytics/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const [project, invoices, expenses] = await Promise.all([
            Project.findOne({ id: projectId, userId: req.user.userId }), // Scoped
            Invoice.find({ projectId, userId: req.user.userId }),       // Scoped
            Expense.find({ projectId, userId: req.user.userId })        // Scoped
        ]);

        if (!project) return res.status(404).json({ error: 'Project not found' });

        const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + inv.amount, 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const monthlyData = {};
        invoices.concat(expenses).forEach(item => {
            const date = new Date(item.date);
            if (isNaN(date)) return;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, expenses: 0 };
            if (item.amount && 'status' in item && item.status === 'paid') monthlyData[monthKey].revenue += item.amount;
            else if (item.amount && !('status' in item)) monthlyData[monthKey].expenses += item.amount;
        });

        const monthlyBreakdown = Object.keys(monthlyData).sort().map((month, index, array) => {
            const data = monthlyData[month];
            const profit = data.revenue - data.expenses;
            const resData = { month, ...data, netProfit: profit, profitMargin: data.revenue > 0 ? parseFloat(((profit / data.revenue) * 100).toFixed(2)) : 0 };
            if (index > 0) {
                const prevProfit = monthlyData[array[index - 1]].revenue - monthlyData[array[index - 1]].expenses;
                if (prevProfit !== 0) resData.profitChange = parseFloat((((profit - prevProfit) / Math.abs(prevProfit)) * 100).toFixed(2));
            }
            return resData;
        });

        res.json({
            project, totalRevenue, totalExpenses, netProfit,
            profitMargin: parseFloat(profitMargin.toFixed(2)),
            monthlyBreakdown,
            budgetVsActual: {
                budget: project.budget,
                actual: totalExpenses,
                variance: project.budget - totalExpenses,
                variancePercent: project.budget > 0 ? parseFloat((((project.budget - totalExpenses) / project.budget) * 100).toFixed(2)) : 0
            }
        });
    } catch (error) {
        console.error('Error fetching project detail:', error);
        res.status(500).json({ error: 'Failed to fetch project detail' });
    }
});

// POST Create new project
app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { name, client, budget, expectedRevenue, startDate, endDate, costCategories, status } = req.body;
        if (!name || name.length < 3) return res.status(400).json({ error: 'Project name must be at least 3 characters' });
        if (!budget || budget <= 0) return res.status(400).json({ error: 'Budget must be a positive number' });
        if (!startDate) return res.status(400).json({ error: 'Start date is required' });

        const project = new Project({
            id: 'p' + Date.now(),
            name, client: client || '', budget,
            estimatedCost: budget,
            expectedRevenue: expectedRevenue || budget * 1.3,
            startDate, endDate: endDate || '',
            status: status || 'active',
            costCategories: costCategories || [],
            userId: req.user.userId
        });

        await project.save();
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// PATCH Update project
app.patch('/api/projects/:id', authenticateToken, async (req, res) => {
    const { id: paramId } = req.params;
    const userId = req.user.userId;

    try {
        const { id, _id, userId: bodyUserId, ...updates } = req.body;

        // Try exact match first
        let project = await Project.findOneAndUpdate(
            { id: paramId, userId: userId },
            { $set: updates },
            { new: true, runValidators: true, context: 'query' }
        );

        // Fallback: if not found by userId, check if it exists but is owned by someone else or has no owner (legacy)
        if (!project) {
            const exists = await Project.findOne({ id: paramId });
            if (exists) {
                // If it has no userId, allow the first user who tries to update it to "claim" it (legacy support)
                if (!exists.userId) {
                    console.info(`[LEGACY] Assigning project ${paramId} to user ${userId}`);
                    project = await Project.findOneAndUpdate(
                        { id: paramId },
                        { $set: { ...updates, userId: userId } },
                        { new: true, runValidators: true, context: 'query' }
                    );
                } else {
                    console.warn(`[DEBUG] Project ${paramId} exists but owned by ${exists.userId}, not ${userId}`);
                    return res.status(403).json({
                        error: 'Unauthorized',
                        details: 'This project belongs to another user.'
                    });
                }
            } else {
                return res.status(404).json({ error: 'Project not found' });
            }
        }

        res.json(project);
    } catch (error) {
        console.error('[DEBUG] Project PATCH error:', error);
        res.status(500).json({
            error: 'Failed to update project',
            details: error.message
        });
    }
});

// POST Update project (Fallback)
app.post('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const { id, _id, userId, ...updates } = req.body;
        const project = await Project.findOneAndUpdate(
            { id: req.params.id, userId: req.user.userId },
            { $set: updates },
            { new: true, runValidators: true, context: 'query' }
        );
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
});

// DELETE Project (Soft Delete)
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOneAndUpdate(
            { id: req.params.id, userId: req.user.userId },
            { $set: { isDeleted: true } },
            { new: true }
        );
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted successfully (soft delete)', id: project.id });
    } catch (error) {
        console.error('Project deletion error:', error);
        res.status(500).json({ error: 'Failed to delete project', details: error.message });
    }
});

// GET All Financial Data (Scoped)
app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        const [projects, invoices, expenses] = await Promise.all([
            Project.find({ userId: req.user.userId, isDeleted: { $ne: true } }),
            Invoice.find({ userId: req.user.userId }),
            Expense.find({ userId: req.user.userId })
        ]);
        res.json({ projects, invoices, expenses });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch financial data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
