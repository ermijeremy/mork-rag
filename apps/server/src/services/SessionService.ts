import { query } from '../db.js';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export class SessionService {
    
    // Create the table if not exist
    static async init() {
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Check if password_hash column exists, if not add it (simple migration)
            try {
                await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
            } catch (e) {
                // Ignore if it fails slightly differently on some postgres versions, but IF NOT EXISTS is standard
                console.warn("Migration warning:", e);
            }

            try {
                await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);`);
                
            } catch (e) {
                console.log("Session table migration skipped or failed (might be new table or unsupported syntax):", e);
            }

            try {
                await query(`ALTER TABLE sessions ALTER COLUMN username DROP NOT NULL;`);
            } catch (e) {
            }

             await query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } catch (e) {
            console.error("Error initializing DB:", e);
        }
    }

    private static async hashPassword(password: string): Promise<string> {
        const salt = randomBytes(16).toString('hex');
        const buff = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buff.toString('hex')}.${salt}`;
    }

    private static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
        const [auditHash, salt] = storedHash.split('.');
        const buff = (await scryptAsync(password, salt, 64)) as Buffer;
        return timingSafeEqual(Buffer.from(auditHash, 'hex'), buff);
    }

    static async login(username: string, password?: string): Promise<{ id: number, username: string }> {
        // find user
        const findRes = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
        
        if (findRes.rows.length === 0) {
            throw new Error("User not found");
        }

        const user = findRes.rows[0];
        
        // If user has a password hash, verify it
        if (user.password_hash) {
            if (!password) {
                 throw new Error("Password required");
            }
            const isValid = await this.verifyPassword(password, user.password_hash);
            if (!isValid) {
                throw new Error("Invalid password");
            }
        } else if (password) {
            const newHash = await this.hashPassword(password);
            await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
        }
        
        return { id: user.id, username: user.username };
    }

    static async register(username: string, password?: string): Promise<{ id: number, username: string }> {
        // Check if user exists
        const findRes = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (findRes.rows.length > 0) {
            throw new Error("Username already taken");
        }

        if (!password) {
             throw new Error("Password required for registration");
        }

        // Create new user with password
        const hash = await this.hashPassword(password);
        const createRes = await query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, hash]
        );
        return createRes.rows[0];
    }

    static async createSession(token: string, userId: number): Promise<void> {
        await query(
            'INSERT INTO sessions (token, user_id) VALUES ($1, $2)',
            [token, userId]
        );
    }

    static async validateSession(token: string): Promise<boolean> {
        const res = await query(
            'SELECT token FROM sessions WHERE token = $1',
            [token]
        );
        return res.rowCount !== null && res.rowCount > 0;
    }

    static async getUserByToken(token: string): Promise<{ id: number, username: string } | null> {
        const res = await query(
            `SELECT u.id, u.username 
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.token = $1`,
            [token]
        );
        if (res.rowCount && res.rowCount > 0) {
            return res.rows[0];
        }
        return null;
    }

    static async deleteSession(token: string): Promise<void> {
        await query('DELETE FROM sessions WHERE token = $1', [token]);
    }
}
