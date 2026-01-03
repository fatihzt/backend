import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (fastify: FastifyInstance) => {
    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'EventDiscovery API',
                description: 'Professional Event Discovery & Notification Engine',
                version: '1.0.0'
            },
            servers: [
                { url: 'http://localhost:3000' }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    },
                    apiKey: {
                        type: 'apiKey',
                        name: 'x-api-key',
                        in: 'header'
                    }
                }
            }
        }
    });

    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        },
        staticCSP: true,
        transformStaticCSP: (header) => header
    });
});
