import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_password@localhost:5432/mork_rag'
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
