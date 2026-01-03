import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Pool } from 'pg';

export default fp(async (fastify: FastifyInstance) => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        fastify.log.info('Postgres connected successfully');
        client.release();
    } catch (err) {
        fastify.log.error(err, 'Postgres connection failed');
    }

    fastify.decorate('pg', pool);

    fastify.addHook('onClose', async (instance) => {
        await pool.end();
    });
});

declare module 'fastify' {
    interface FastifyInstance {
        pg: Pool;
    }
}
