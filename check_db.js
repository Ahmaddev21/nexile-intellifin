import mongoose from 'mongoose';
import { Invoice } from './server/models.js';

async function checkInvoices() {
    await mongoose.connect('mongodb://127.0.0.1:27017/nexile-intellifin');
    const invoices = await Invoice.find({});
    console.log('Invoices in DB:', JSON.stringify(invoices, null, 2));
    await mongoose.connection.close();
}

checkInvoices();
