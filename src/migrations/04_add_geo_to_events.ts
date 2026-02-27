import { FastifyInstance } from 'fastify';

export async function up(fastify: FastifyInstance) {
    const fAny = fastify as any;
    fastify.log.info('Running migration: 04_add_geo_to_events');

    await fAny.pg.query(`
        ALTER TABLE events 
        ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
    `);
}
