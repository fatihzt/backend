
import { FastifyPluginAsync } from 'fastify';
import { PipelineService } from '../../services/pipeline';
import { WorkerService } from '../../services/worker';

const adminRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

    // 1. Manually Trigger ENTIRE Pipeline (Background)
    fastify.post('/refresh', {
        schema: {
            tags: ['Admin'],
            summary: 'Alpha Refresh: Ticketmaster + Etkinlik.io + Scraper',
            description: 'Triggers the background ingestion pipeline for all sources.',
            security: [{ apiKey: [] }],
            response: {
                202: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [fastify.verifyApiKey]
    }, async (request, reply) => {
        // Run in background so we don't timeout the HTTP request
        console.log('🚀 [ADMIN] Manual Trigger: Multi-Source Ingestion started...');
        PipelineService.runIngestion(fastify).catch(err => {
            fastify.log.error(err, 'Background pipeline failed');
        });

        return reply.code(202).send({
            message: 'Multi-Source Pipeline started in background',
            status: 'accepted'
        });
    });

    // Support legacy endpoints
    fastify.post('/ingest', async (request, reply) => {
        PipelineService.runIngestion(fastify);
        return { message: 'Ingestion started' };
    });

    fastify.post('/process-queue', async (request, reply) => {
        WorkerService.processAll(fastify);
        return { message: 'Worker started' };
    });
};

export default adminRoutes;
