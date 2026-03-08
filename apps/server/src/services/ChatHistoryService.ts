import { query } from '../db.js';

export interface ChatNode {
    id: number;
    parent_id: number | null;
    user_message: string;
    ai_response: string;
    created_at: Date;
}

export class ChatHistoryService {
    static async init() {
        await query(`
            CREATE TABLE IF NOT EXISTS chat_nodes (
                id SERIAL PRIMARY KEY,
                session_id TEXT REFERENCES sessions(token) ON DELETE CASCADE,
                parent_id INTEGER REFERENCES chat_nodes(id) ON DELETE SET NULL,
                user_message TEXT NOT NULL,
                ai_response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        try {
            await query(`ALTER TABLE chat_nodes ADD COLUMN IF NOT EXISTS username TEXT;`);
            await query(`
                UPDATE chat_nodes 
                SET username = sessions.username 
                FROM sessions 
                WHERE chat_nodes.session_id = sessions.token 
                AND chat_nodes.username IS NULL;
            `);
        } catch (e) {
            console.error("Migration error (ignorable if column exists):", e);
        }
    }

    static async addNode(sessionId: string, username: string, userMessage: string, aiResponse: string, parentId: number | null = null): Promise<number> {
        const res = await query(
            'INSERT INTO chat_nodes (session_id, username, user_message, ai_response, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [sessionId, username, userMessage, aiResponse, parentId]
        );
        return res.rows[0].id;
    }

    static async getPath(nodeId: number): Promise<ChatNode[]> {
        const res = await query(`
            WITH RECURSIVE path AS (
                SELECT id, parent_id, user_message, ai_response, created_at
                FROM chat_nodes
                WHERE id = $1
                UNION ALL
                SELECT cn.id, cn.parent_id, cn.user_message, cn.ai_response, cn.created_at
                FROM chat_nodes cn
                JOIN path p ON p.parent_id = cn.id
            )
            SELECT id, parent_id, user_message, ai_response, created_at
            FROM path
            ORDER BY created_at ASC;
        `, [nodeId]);

        return res.rows;
    }

    static async getGraph(username: string): Promise<ChatNode[]> {
        const res = await query(
            'SELECT id, parent_id, user_message, ai_response, created_at FROM chat_nodes WHERE username = $1 ORDER BY created_at ASC',
            [username]
        );
        return res.rows;
    }
}
