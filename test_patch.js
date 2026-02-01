import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Invoice, User } from './server/models.js';

const JWT_SECRET = 'your-secret-key-change-this-in-env';

async function testUpdate() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/nexile-intellifin');
        console.log('Connected to DB');

        const user = await User.findOne({ username: 'ahmad' }); // Pick the one we know
        if (!user) {
            console.log('Target user not found');
            return;
        }

        const invoice = await Invoice.findOne({ userId: user._id.toString() });
        if (!invoice) {
            console.log('No invoice for this user');
            return;
        }

        console.log('Testing with invoice:', invoice.id, 'userId:', user._id.toString());

        const token = jwt.sign({ userId: user._id.toString(), username: user.username }, JWT_SECRET);

        const response = await fetch(`http://localhost:5000/api/invoices/${invoice.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'paid' })
        });

        const body = await response.json();
        console.log('Status:', response.status);
        console.log('Body:', body);

    } catch (err) {
        console.error('Test script error:', err);
    } finally {
        await mongoose.connection.close();
    }
}

testUpdate();
