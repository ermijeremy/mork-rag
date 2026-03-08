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
    }

    static async addNode(sessionId: string, userMessage: string, aiResponse: string, parentId: number | null = null): Promise<number> {
        const res = await query(
            'INSERT INTO chat_nodes (session_id, user_message, ai_response, parent_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [sessionId, userMessage, aiResponse, parentId]
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

    static async getGraph(sessionId: string): Promise<ChatNode[]> {
        const res = await query(
            'SELECT id, parent_id, user_message, ai_response, created_at FROM chat_nodes WHERE session_id = $1 ORDER BY created_at ASC',
            [sessionId]
        );
        return res.rows;
    }
}
