import './env.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexile-intelligent-finance-secret-2026';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('[DEBUG] JWT Verification Error:', err.message);
            console.error('[DEBUG] Secret used (start):', JWT_SECRET?.substring(0, 5));
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};
