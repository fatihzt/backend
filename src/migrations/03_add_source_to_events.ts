
import { FastifyInstance } from 'fastify';

export async function up(fastify: FastifyInstance) {
    const fAny = fastify as any;
    console.log('🚀 Running Migration: Add source column to events');

    await fAny.pg.query(`
        ALTER TABLE events ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Scraper';
    `);
}
