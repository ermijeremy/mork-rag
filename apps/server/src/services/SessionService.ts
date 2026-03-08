import { query } from '../db.js';

export class SessionService {
    
    // Create the table if not exist
    static async init() {
        await query(`
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    static async createSession(token: string, username: string): Promise<void> {
        await query(
            'INSERT INTO sessions (token, username) VALUES ($1, $2)',
            [token, username]
        );
    }

    static async validateSession(token: string): Promise<boolean> {
        const res = await query(
            'SELECT token FROM sessions WHERE token = $1',
            [token]
        );
        return res.rowCount !== null && res.rowCount > 0;
    }

    static async getUserByToken(token: string): Promise<string | null> {
        const res = await query(
            'SELECT username FROM sessions WHERE token = $1',
            [token]
        );
        if (res.rowCount && res.rowCount > 0) {
            return res.rows[0].username;
        }
        return null;
    }

    static async deleteSession(token: string): Promise<void> {
        await query('DELETE FROM sessions WHERE token = $1', [token]);
    }
}
