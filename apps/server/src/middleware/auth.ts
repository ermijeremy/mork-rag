import { Context, Next } from 'hono';
import { SessionService } from '../services/SessionService.js';

// Match the Variables type defined in index.ts
type AppVariables = {
    sessionToken: string;
    username: string;
    userId: number;
};

export async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing or invalid token format' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        // Validate against Postgres
        const user = await SessionService.getUserByToken(token);
        if (!user) {
            return c.json({ error: 'Unauthorized: Invalid token' }, 401);
        }

        c.set('sessionToken', token);
        c.set('username', user.username);
        c.set('userId', user.id);
    } catch (e) {
        console.error("Auth middleware error:", e);
        return c.json({ error: 'Internal Server Error during authentication' }, 500);
    }

    await next();
}
