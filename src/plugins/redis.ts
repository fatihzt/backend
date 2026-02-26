import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

export default fp(async (fastify: FastifyInstance) => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        fastify.log.warn('REDIS_URL not found, Redis plugin skipped. Using memory cache.');
        return;
    }

    const redis = new Redis(redisUrl);

    try {
        await redis.ping();
        fastify.decorate('redis', redis);
        fastify.log.info('Redis connected successfully');
    } catch (err) {
        fastify.log.warn('Redis connection failed, falling back to memory cache.');
    }
});

declare module 'fastify' {
    interface FastifyInstance {
        redis?: Redis;
    }
}
