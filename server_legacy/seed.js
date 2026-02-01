import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Project, Invoice, Expense } from './models.js';

dotenv.config();

// Mock Data from constants.ts
const PROJECTS = [
    { id: 'p1', name: 'Cloud Migration', budget: 50000, estimatedCost: 35000, startDate: '2023-11-01', status: 'active' },
    { id: 'p2', name: 'AI Integration', budget: 75000, estimatedCost: 50000, startDate: '2024-01-15', status: 'active' },
    { id: 'p3', name: 'Cybersecurity Audit', budget: 20000, estimatedCost: 15000, startDate: '2023-12-10', status: 'completed' },
    { id: 'p4', name: 'Mobile App Refresh', budget: 45000, estimatedCost: 30000, startDate: '2024-02-01', status: 'active' }
];

const INVOICES = [
    { id: 'inv-001', clientId: 'c1', clientName: 'TechCorp', projectId: 'p1', projectName: 'Cloud Migration', amount: 25000, date: '2024-01-10', status: 'paid' },
    { id: 'inv-002', clientId: 'c2', clientName: 'GlobalSoft', projectId: 'p2', projectName: 'AI Integration', amount: 35000, date: '2024-02-05', status: 'sent' },
    { id: 'inv-003', clientId: 'c1', clientName: 'TechCorp', projectId: 'p1', projectName: 'Cloud Migration', amount: 25000, date: '2024-02-28', status: 'pending' },
    { id: 'inv-004', clientId: 'c3', clientName: 'BioHealth', projectId: 'p3', projectName: 'Cybersecurity Audit', amount: 20000, date: '2023-12-20', status: 'paid' },
    { id: 'inv-005', clientId: 'c4', clientName: 'RetailLink', projectId: 'p4', projectName: 'Mobile App Refresh', amount: 15000, date: '2024-03-01', status: 'overdue' }
];

const EXPENSES = [
    { id: 'exp-001', category: 'Software', projectId: 'p1', projectName: 'Cloud Migration', amount: 5000, date: '2024-01-05', type: 'variable' },
    { id: 'exp-002', category: 'Infrastructure', projectId: 'p1', projectName: 'Cloud Migration', amount: 12000, date: '2024-01-15', type: 'fixed' },
    { id: 'exp-003', category: 'Consulting', projectId: 'p2', projectName: 'AI Integration', amount: 8000, date: '2024-02-10', type: 'variable' },
    { id: 'exp-004', category: 'Marketing', projectId: 'p4', projectName: 'Mobile App Refresh', amount: 4500, date: '2024-02-15', type: 'variable' },
    { id: 'exp-005', category: 'Rent', projectId: 'p1', projectName: 'Cloud Migration', amount: 2000, date: '2024-01-01', type: 'fixed' },
    { id: 'exp-006', category: 'Salaries', projectId: 'p2', projectName: 'AI Integration', amount: 15000, date: '2024-02-28', type: 'fixed' }
];

mongoose.connect('mongodb://127.0.0.1:27017/nexile-intellifin')
    .then(async () => {
        console.log('Connected to MongoDB. Seeding data...');

        await Project.deleteMany({});
        await Invoice.deleteMany({});
        await Expense.deleteMany({});

        await Project.insertMany(PROJECTS);
        await Invoice.insertMany(INVOICES);
        await Expense.insertMany(EXPENSES);

        console.log('Database seeded successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error seeding database:', err);
        process.exit(1);
    });
