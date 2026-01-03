
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';

export default fp(async (fastify) => {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecret'
    });

    // Decorator for JWT Authentication
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (err: any) {
            return reply.code(401).send({ 
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            });
        }
    });

    // Decorator for API Key Validation
    fastify.decorate('verifyApiKey', async (request: FastifyRequest, reply: FastifyReply) => {
        const apiKey = request.headers['x-api-key'];
        
        // Get valid API keys from environment variables
        const validApiKeys = process.env.API_KEYS?.split(',') || [];
        
        // Add default keys for development (remove in production!)
        if (process.env.NODE_ENV !== 'production') {
            validApiKeys.push('eventapp-mobile-secret-key-2026');
        }

        if (!apiKey || !validApiKeys.includes(apiKey as string)) {
            return reply.code(403).send({ message: 'Forbidden: Invalid API Key' });
        }
    });
});

declare module 'fastify' {
    export interface FastifyInstance {
        authenticate: any;
        verifyApiKey: any;
    }
}
