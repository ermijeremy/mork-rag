import { pipeline } from '@xenova/transformers';

export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
}

export class XenovaEmbeddingService implements EmbeddingProvider {
    private extractor: any;
    private model: string;
    private dimensions: number;

    constructor(model: string = 'Xenova/all-MiniLM-L6-v2', dimensions: number = 256) {
        this.model = model;
        this.dimensions = dimensions;
    }

    private async init() {
        if (!this.extractor) {
            console.log(`Loading local embedding model: ${this.model}...`);
            try {
                this.extractor = await pipeline('feature-extraction', this.model);
            } catch (e) {
                console.error("Failed to load local embedding model. Attempting to force download or check network.", e);
                throw new Error("Local embedding model failed to load. Check internet connection for initial model download.");
            }
            console.log("Model loaded.");
        }
    }

    // embeds data using all-MiniLM-L6-v2 256 dimension model,
    // better to switch to larger model to get better embedding
    async embed(text: string): Promise<number[]> {
        await this.init();

        try {
            const output = await this.extractor(text, { pooling: 'mean', normalize: true });
            const fullEmbedding = Array.from(output.data) as number[];

            return fullEmbedding.slice(0, this.dimensions);
        } catch (error) {
            console.error("Local Embedding Error:", error);
            throw error;
        }
    }
}