import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';

export default fp(async (fastify: FastifyInstance) => {
    // We will run this only once or rely on Supabase migrations
    // For simplicity in this environment, we'll expose a function or run on start
    fastify.decorate('runMigrations', async () => {
        const sqlPath = path.join(__dirname, '..', 'database', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        const client = await fastify.pg.connect();
        try {
            await client.query(sql);
            fastify.log.info('Migrations executed successfully');
        } catch (err) {
            fastify.log.error(err, 'Migration failed');
        } finally {
            client.release();
        }
    });
});

declare module 'fastify' {
    interface FastifyInstance {
        runMigrations: () => Promise<void>;
    }
}
