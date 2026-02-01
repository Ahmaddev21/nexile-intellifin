import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Invoice, User } from './server/models.js';

const JWT_SECRET = 'your-secret-key-change-this-in-env';

async function testUpdate() {
    await mongoose.connect('mongodb://127.0.0.1:27017/nexile-intellifin');

    // Get a user
    const user = await User.findOne({});
    if (!user) {
        console.log('No user found');
        return;
    }

    // Get an invoice for this user
    const invoice = await Invoice.findOne({ userId: user._id.toString() });
    if (!invoice) {
        console.log('No invoice found for user', user.username);
        // Create one for testing if needed, but let's see if we can find any
        const anyInvoice = await Invoice.findOne({});
        if (!anyInvoice) {
            console.log('No invoices in DB at all');
            return;
        }
        console.log('Found an invoice but assigned to different user or userId is wrong. ID:', anyInvoice.id, 'userId in invoice:', anyInvoice.userId, 'user._id:', user._id);
    } else {
        console.log('Found invoice:', invoice.id, 'for user:', user.username);
    }

    const testInvoice = invoice || (await Invoice.findOne({}));
    const testUserId = testInvoice.userId;

    // Generate token for this userId
    const token = jwt.sign({ userId: testUserId, username: 'test-user' }, JWT_SECRET);

    console.log('Token:', token);
    console.log('Target Invoice ID:', testInvoice.id);

    // Try to update using fetch (simulating frontend)
    const res = await fetch(`http://localhost:5000/api/invoices/${testInvoice.id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'paid' })
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    await mongoose.connection.close();
}

testUpdate();
