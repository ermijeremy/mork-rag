import fs from 'fs';
import { MorkService } from './MorkService.js';



const morkUrl = process.env.MORK_URL || 'http://localhost:8001';
const morkService = new MorkService(morkUrl);

export interface Post {
  id: string;
  properties: Record<string, string>;
}

export class MettaParser {
  // Parses a metta file (needs pipeline to feed metta data) and returns structured posts
  static async parse(filePath: string, load = false): Promise<Post[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    const posts: Record<string, Post> = {};
    const regex = /\(([\w-]+)\s+(A_\w+)\s+"([^"]+)"\)/;

    for (const line of lines) {
      if (load) { await morkService.uploadMetta(line); }
      const match = line.match(regex);
      if (match) {
        const [, property, id, value] = match;
        if (!posts[id]) {
          posts[id] = { id, properties: {} };
        }
        posts[id].properties[property] = value;
      }
    }
    return Object.values(posts);
  }

  // format the data to properly feed into embedding model, so that the embedding capture relevant data
  static toEmbeddingString(post: Post): string {
    return Object.entries(post.properties)
      .map(([key, value]) => `${key} ${post.id} "${value}"`)
      .join(' ');
  }
}