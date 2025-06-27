import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'apilens',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthManager {
    static async authenticateUser(username, password) {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
            if (result.rows.length === 0) return null;
            
            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password_hash);
            
            if (isValid) {
                const token = jwt.sign(
                    { userId: user.id, username: user.username, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                return { user: { id: user.id, username: user.username, role: user.role }, token };
            }
            return null;
        } finally {
            client.release();
        }
    }
    
    static async getUserSiteAccess(userId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT s.name, usa.access_level 
                FROM user_site_access usa
                JOIN sites s ON usa.site_id = s.id
                WHERE usa.user_id = $1
            `, [userId]);
            return result.rows;
        } finally {
            client.release();
        }
    }
    
    static verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    static async createUser(username, email, password, role = 'viewer') {
        const client = await pool.connect();
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await client.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
                [username, email, hashedPassword, role]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }
}

export function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = AuthManager.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
}

export function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}