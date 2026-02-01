import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    client: { type: String, required: false },
    budget: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    expectedRevenue: { type: Number, required: false },
    startDate: { type: String, required: true },
    endDate: { type: String, required: false },
    status: { type: String, enum: ['active', 'completed', 'on-hold', 'archived'], required: true },
    isDeleted: { type: Boolean, default: false },
    costCategories: { type: [String], required: false },
    userId: { type: String, required: true } // userId is now required
});

const InvoiceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    projectId: { type: String, required: true },
    projectName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['paid', 'sent', 'overdue', 'pending', 'cancelled', 'draft'], required: true },
    userId: { type: String, required: true } // Added required userId
});

const ExpenseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    projectId: { type: String, required: true },
    projectName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['fixed', 'variable'], required: true },
    userId: { type: String, required: true } // Added required userId
});

const CompanySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    fiscalYearStart: { type: String, default: 'January' },
    industry: { type: String, default: 'Services' }
});

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    subscriptionStatus: { type: String, default: 'trial' }
});

export const Project = mongoose.model('Project', ProjectSchema);
export const Invoice = mongoose.model('Invoice', InvoiceSchema);
export const Expense = mongoose.model('Expense', ExpenseSchema);
export const User = mongoose.model('User', UserSchema);
export const Company = mongoose.model('Company', CompanySchema);
