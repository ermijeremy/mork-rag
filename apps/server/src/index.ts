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
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

dns.setDefaultResultOrder('ipv4first');

type AppVariables = {
    sessionToken: string;
    username: string;
    userId: number;
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
        const { username, password } = body;
        if (!username || !password) return c.json({ error: "Username and password required" }, 400);

        // Generate simple token
        const token = `mork_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        let user;
        try {
            user = await SessionService.login(username, password);
        } catch (authError: any) {
             console.error("Login error:", authError.message);
             return c.json({ error: authError.message || "Login failed" }, 401);
        }

        // Persist to Postgres
        await SessionService.createSession(token, user.id);

        return c.json({ token, username, userId: user.id });
    } catch (e: any) {
        console.error(e);
        return c.json({ error: e.message }, 500);
    }
});

app.post('/api/register', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password } = body;
        if (!username || !password) return c.json({ error: "Username and password required" }, 400);

        // Generate simple token
        const token = `mork_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        let user;
        try {
            user = await SessionService.register(username, password);
        } catch (regError: any) {
             console.error("Registration error:", regError.message);
             return c.json({ error: regError.message || "Registration failed" }, 400);
        }

        // Persist to Postgres
        await SessionService.createSession(token, user.id);

        return c.json({ token, username, userId: user.id });
    } catch (e: any) {
        console.error(e);
        return c.json({ error: e.message }, 500);
    }
});

// Ingest data into mork
app.post('/api/ingest', authMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        
        const contentType = c.req.header('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const body = await c.req.parseBody();
            const file = body['file'];
            
            if (file && file instanceof File) {
                 const buffer = await file.arrayBuffer();
                 let dataPath = '';
                 if (process.env.DATA_PATH) {
                     dataPath = path.resolve(process.cwd(), process.env.DATA_PATH);
                 } else {
                     dataPath = path.resolve(process.cwd(), '../../data/data.metta');
                 }
                 
                 const bufferObj = Buffer.from(buffer);
                 await writeFile(dataPath, bufferObj);
                 console.log(`Updated data file at ${dataPath}`);

                 // Also update client public data for visualization
                 try {
                     const clientDataPath = path.resolve(process.cwd(), '../client/public/data.metta');
                     await writeFile(clientDataPath, bufferObj);
                     console.log(`Updated client visualization data at ${clientDataPath}`);
                 } catch (e) {
                     console.warn("Failed to update client data file:", e);
                 }
            }
        }
        
        // Convert number to string for namespace
        const result = await chatService.ingestData(String(userId));
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
        const username = c.get('username');
        const userId = c.get('userId');

        let historyContext = '';
        if (parentId) {
            const pathNodes = await ChatHistoryService.getPath(parentId);
            historyContext = pathNodes
                .map(n => `User: ${n.user_message}\nAssistant: ${n.ai_response}`)
                .join('\n---\n');
        }

        // Call the LLM with RAG context + graph branch history
        const response = await chatService.chat(message, historyContext, String(userId));

        // Persist the new node in the graph (branching off parentId if given)
        const nodeId = await ChatHistoryService.addNode(
            sessionToken,
            username,
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
        const username = c.get('username');
        const graph = await ChatHistoryService.getGraph(username);
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
