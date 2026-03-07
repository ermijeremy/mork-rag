import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { ChatService } from './services/ChatService.js';
import { authMiddleware } from './middleware/auth.js';
import { SessionService } from './services/SessionService.js';
import { ChatHistoryService } from './services/ChatHistoryService.js';
import "dotenv/config";
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

type AppVariables = {
    sessionToken: string;
};

const app = new Hono<{ Variables: AppVariables }>();

SessionService.init()
    .then(() => ChatHistoryService.init())
    .catch(console.error);

app.use('*', logger());
app.use('*', cors());

const chatService = new ChatService();

app.get('/', (c) => c.text('MORK RAG Server is Running'));

// --- Routes ---

app.post('/api/login', async (c) => {
    try {
        const body = await c.req.json();
        const { username } = body;
        if (!username) return c.json({ error: "Username required" }, 400);

        // Generate simple token
        const token = `mork_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Persist to Postgres
        await SessionService.createSession(token, username);

        return c.json({ token, username });
    } catch (e: any) {
        console.error(e);
        return c.json({ error: e.message }, 500);
    }
});

// Ingest data into mork
app.post('/api/ingest', authMiddleware, async (c) => {
    try {
        const result = await chatService.ingestData();
        return c.json({ success: true, message: result });
    } catch (e: any) {
        console.error(e);
        return c.json({ success: false, error: e.message }, 500);
    }
});


app.post('/api/chat', authMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { message, parentId } = body as { message: string; parentId?: number | null };

        if (!message) return c.json({ error: "Message is required" }, 400);

        const sessionToken = c.get('sessionToken');

        let historyContext = '';
        if (parentId) {
            const pathNodes = await ChatHistoryService.getPath(parentId);
            historyContext = pathNodes
                .map(n => `User: ${n.user_message}\nAssistant: ${n.ai_response}`)
                .join('\n---\n');
        }

        // Call the LLM with RAG context + graph branch history
        const response = await chatService.chat(message, historyContext);

        // Persist the new node in the graph (branching off parentId if given)
        const nodeId = await ChatHistoryService.addNode(
            sessionToken,
            message,
            response,
            parentId ?? null
        );

        return c.json({ response, nodeId, parentId: parentId ?? null });
    } catch (e: any) {
        console.error(e);
        return c.json({ success: false, error: e.message }, 500);
    }
});


app.get('/api/chat/graph', authMiddleware, async (c) => {
    try {
        const sessionToken = c.get('sessionToken');
        const graph = await ChatHistoryService.getGraph(sessionToken);
        return c.json({ graph });
    } catch (e: any) {
        console.error(e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port
});

export default app;
