import { MorkApiClient } from 'mork-ts-sdk';
import { UploadRequest } from 'mork-ts-sdk';
import { ExportRequest } from 'mork-ts-sdk';
import { ClearRequest } from 'mork-ts-sdk';

export class MorkService {
    private client: MorkApiClient;

    constructor(endpoint: string = 'http://localhost:8001') {
        this.client = new MorkApiClient(endpoint);
    }

    // Clear mork db
    async clearGraph(): Promise<void> {

        try {
            const clearReq = new ClearRequest();
            clearReq.exprVal = "$x";
            await this.client.dispatch(clearReq);
            console.log("MORK db cleared.");

        } catch (e) {
            console.warn("Clear MORK failed:", e);
        }
    }

    // upload facts to mork
    async uploadMetta(mettaContent: string): Promise<void> {
        const req = new UploadRequest();
        req.patternVal = "$x";
        req.templateVal = "$x";
        req.dataVal = mettaContent;
        await this.client.dispatch(req);
    }

    // upload embeddings to mork
    async uploadEmbeddings(id: string, embedding: number[]): Promise<void> {
        const mettaLines = embedding.map((val, idx) => `(embed ${id} ${idx + 1} ${val})`);
        await this.uploadMetta(mettaLines.join('\n'));
    }

    // retrieve embeddings from mork
    async getAllEmbeddings(): Promise<{ id: string, index: number, value: number }[]> {
        const req = new ExportRequest();
        req.patternVal = "(embed $id $idx $val)";
        req.templateVal = "(embed $id $idx $val)";

        const result = await this.client.dispatch(req);

        const updates: { id: string, index: number, value: number }[] = [];
        const regex = /\(embed\s+([\w-]+)\s+(\d+)\s+([-\d.eE]+)\)/g;

        let match;
        while ((match = regex.exec(result)) !== null) {
            updates.push({
                id: match[1],
                index: parseInt(match[2]),
                value: parseFloat(match[3])
            });
        }
        return updates;
    }

    // query mork to retrieve posts(facts) by id
    async getPostById(id: string): Promise<string> {
        const req = new ExportRequest();
        req.patternVal = `($x ${id} $y)`;
        req.templateVal = `($x ${id} $y)`;

        try {
            const result = await this.client.dispatch(req);
            return result;
        } catch (e) {
            console.error(`Failed to fetch post ${id}`, e);
            return "";
        }
    }

}
