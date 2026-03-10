import { MettaParser, Post } from './MettaParser.js';
import { MorkService } from './MorkService.js';
import { XenovaEmbeddingService } from './EmbeddingService.js';

export class ChatService {
    private morkService: MorkService;
    private embeddingService: XenovaEmbeddingService;
    private mistralUrl: string;
    private mistralKey: string;

    constructor() {
        const morkUrl = process.env.MORK_URL || 'http://localhost:8001';
        this.mistralUrl = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
        this.mistralKey = process.env.MISTRAL_API_KEY || '';

        this.morkService = new MorkService(morkUrl);
        this.embeddingService = new XenovaEmbeddingService();
    }

    // Ingestion
    async ingestData(userId: string, filePath?: string): Promise<string> {
        let resolvedPath = filePath;
        if (!resolvedPath) {
            const envPath = process.env.DATA_PATH;
            if (envPath) {
                // @ts-ignore
                const path = await import('path');
                resolvedPath = path.resolve(process.cwd(), envPath);
            } else {
                // @ts-ignore
                const path = await import('path');
                resolvedPath = path.resolve(__dirname, '../../../../data/data.metta');
            }
        }

        await this.morkService.clearGraph(userId);

        // @ts-ignore
        const posts = await MettaParser.parse(resolvedPath!, true, userId);

        // Upload to User Namespace
        for (const post of posts) {
            // Generate Embedding
            // @ts-ignore
            const textToEmbed = MettaParser.toEmbeddingString(post);
            const embedding = await this.embeddingService.embed(textToEmbed);

            // Upload Embedding to Namespace
            await this.morkService.uploadEmbeddings(post.id, embedding, userId);
            
        }
        
        return `Ingested ${posts.length} posts into namespace ${userId}.`;
    }

    // Retrieve
    async retrieve(userId: string, query: string, topK: number = 5): Promise<any[]> {
        // embed user query
        const queryEmbedding = await this.embeddingService.embed(query);

        // Fetch embeddings from MORK (User Namespace)
        const allEmbeddingsFlat = await this.morkService.getAllEmbeddings(userId);

        // Reconstruct vectors
        const vectors: Record<string, number[]> = {};

        // Added safe check in case vectors are empty
        if (allEmbeddingsFlat) {
            for (const { id, index, value } of allEmbeddingsFlat) {
                if (!vectors[id]) vectors[id] = [];
                vectors[id][index - 1] = value;
            }
        }

        // Cosine Similarity
        const scores = Object.entries(vectors).map(([id, vector]) => {
            for (let i = 0; i < queryEmbedding.length; i++) {
                if (vector[i] === undefined) vector[i] = 0;
            }

            const score = this.cosineSimilarity(queryEmbedding, vector);
            return { id, score };
        });

        // Top K
        scores.sort((a, b) => b.score - a.score);
        const top = scores.slice(0, topK);

        // Retrieve Content
        const results = [];
        for (const item of top) {
            const content = await this.morkService.getPostById(item.id, userId);
            results.push({ ...item, content });
        }

        return results;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
    }

    // Chat
    // Mistral is used for chat generation(for free api), can switch to larger LLM for better result 
    async chat(message: string, historyContext: string = '', userId: string): Promise<string> {
        const context = await this.retrieve(userId, message);

        const contextStr = context.map(c => `[ID: ${c.id}]\n${c.content}`).join('\n---\n');

        try {
            const systemPrompt = `You are an intelligent assistant helping the user analyze their own posts and content. 
            The provided context contains specific posts with attributes like title, tone, complexity, and engagement. 
            Your goal is to answer briefly the user's question by generalizing patterns and inferring insights from this context. 
            Do not just list the retrieved items; instead, synthesize the information to provide a comprehensive and thoughtful answer based on the user's history. use the retrieved content to answer the question if only if the users question needs the context, otherwise answer the question without using the context. If the context is not relevant to the question, ignore it.`;

            let userPrompt = `Context from Knowledge Base:\n${contextStr}\n\n`;
            if (historyContext) {
                userPrompt += `Conversation History (relevant branch):\n${historyContext}\n\n`;
            }
            userPrompt += `Question: ${message}\nAnswer:`;

            const response = await fetch(`${this.mistralUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.mistralKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-tiny',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Mistral Chat Error: ${err}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (e: any) {
            throw new Error(`LLM Generation failed: ${e.message}`);
        }
    }
}