import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get('/', async function (request, reply) {
        // Check DB connection
        let dbStatus = 'disconnect';
        try {
            const client = await fastify.pg.connect();
            dbStatus = 'connected';
            client.release();
        } catch {
            dbStatus = 'error';
        }

        // Check Redis
        let redisStatus = 'disconnect';
        try {
            if (fastify.redis) {
                await fastify.redis.ping();
                redisStatus = 'connected';
            }
        } catch {
            redisStatus = 'error';
        }

        return {
            status: 'ok',
            db: dbStatus,
            redis: redisStatus,
            message: 'EventApp Backend is running!'
        };
    });
}

export default root;
