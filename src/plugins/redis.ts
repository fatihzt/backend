import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Redis } from '@upstash/redis';

export default fp(async (fastify: FastifyInstance) => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        fastify.log.warn('Upstash credentials not found, Redis plugin skipped.');
        return;
    }

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    fastify.decorate('redis', redis);
});

declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis;
    }
}
