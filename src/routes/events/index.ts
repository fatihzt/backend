
import { FastifyPluginAsync } from 'fastify';
import { listEventsSchema, createEventSchema, rsvpEventSchema, getEventSchema } from './events.schema';

// Simple In-Memory Cache Fallback
const memoryCache = new Map<string, { data: any, expiry: number }>();

// Helper to get cache version
async function getCacheVersion(fastify: any): Promise<number> {
    if (fastify.redis) {
        try {
            const version = await fastify.redis.get('events:cache:version');
            return version ? parseInt(version as string) : 1;
        } catch { return 1; }
    }
    return 1;
}

const eventRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

    // 1. List all events (Filtering + Cache + Pagination)
    fastify.get('/', {
        schema: listEventsSchema
    }, async (request, reply) => {
        const { city, category, search, page: pageStr, limit: limitStr } = request.query as any;

        // Pagination params
        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
        const offset = (page - 1) * limit;

        // Cache Key (include version for cache invalidation)
        const cacheVersion = await getCacheVersion(fastify);
        const cacheKey = `events:v${cacheVersion}:${city || 'all'}:${category || 'all'}:${search || 'none'}:${page}:${limit}`;

        // A. Try Redis Cache
        if (fastify.redis) {
            try {
                const cachedParams = await fastify.redis.get(cacheKey);
                if (cachedParams) {
                    fastify.log.info('Serving events from REDIS cache');
                    return typeof cachedParams === 'string' ? JSON.parse(cachedParams) : cachedParams;
                }
            } catch (err) {
                fastify.log.error(err, 'Redis read error');
            }
        }
        // B. Try Memory Cache (Fallback)
        else {
            const cached = memoryCache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                fastify.log.info('Serving events from MEMORY cache');
                return cached.data;
            }
        }

        // Build WHERE clause
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (city) {
            whereClause += ` AND city = $${paramIndex}`;
            params.push(city);
            paramIndex++;
        }
        if (category) {
            whereClause += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        if (search) {
            whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Count query
        const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;

        // Data query with pagination
        const dataQuery = `SELECT *, (SELECT full_name FROM users WHERE id = creator_id) as creator_name FROM events ${whereClause} ORDER BY start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        let rows;
        let total;
        try {
            const countResult = await fastify.pg.query(countQuery, params.slice(0, paramIndex - 1));
            total = parseInt(countResult.rows[0].count);

            const result = await fastify.pg.query(dataQuery, params);
            rows = result.rows;
        } catch (err: any) {
            fastify.log.error(err, 'Database query failed');
            return reply.code(500).send({
                error: 'Failed to fetch events',
                message: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        const totalPages = Math.ceil(total / limit);
        const response = {
            data: rows,
            total,
            page,
            limit,
            totalPages
        };

        // Save to Cache (5 Minutes)
        if (fastify.redis) {
            try {
                // ioredis syntax: set(key, value, 'EX', seconds)
                await fastify.redis.set(cacheKey, JSON.stringify(response), 'EX', 300);
            } catch (err) {
                fastify.log.error(err, 'Redis write failed');
            }
        } else {
            memoryCache.set(cacheKey, { data: response, expiry: Date.now() + 300000 });
        }

        return response;
    });

    // 2. Create Event
    fastify.post('/', {
        schema: createEventSchema,
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const eventData = request.body as any;
        const creatorId = (request.user as any).id;

        let result;
        try {
            result = await fastify.pg.query(
                `INSERT INTO events (title, description, location, city, category, start_time, end_time, creator_id, image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id, title, city`,
                [
                    eventData.title,
                    eventData.description,
                    eventData.location,
                    eventData.city || 'Istanbul',
                    eventData.category || 'General',
                    eventData.start_time,
                    eventData.end_time,
                    creatorId,
                    eventData.image_url
                ]
            );
        } catch (err: any) {
            fastify.log.error(err, 'Failed to create event');
            return reply.code(500).send({
                error: 'Failed to create event',
                message: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        // Invalidate Cache (version-based approach - O(1) instead of O(N))
        if (fastify.redis) {
            try {
                await fastify.redis.incr('events:cache:version');
            } catch (err) {
                fastify.log.error(err, 'Cache version increment failed');
            }
        } else {
            memoryCache.clear();
        }

        return reply.code(201).send(result.rows[0]);
    });

    // 3. Get Single Event
    fastify.get('/:id', { schema: getEventSchema }, async (request, reply) => {
        const { id } = request.params as any;

        let rows;
        try {
            const result = await fastify.pg.query('SELECT * FROM events WHERE id = $1', [id]);
            rows = result.rows;
        } catch (err: any) {
            fastify.log.error(err, 'Failed to fetch event');
            return reply.code(500).send({
                error: 'Failed to fetch event',
                message: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        if (rows.length === 0) {
            return reply.code(404).send({ message: 'Event not found' });
        }

        return rows[0];
    });

    // 4. RSVP
    fastify.post('/:id/rsvp', {
        schema: rsvpEventSchema,
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as any;
        const userId = (request.user as any).id;

        try {
            await fastify.pg.query(
                'INSERT INTO registrations (user_id, event_id) VALUES ($1, $2)',
                [userId, id]
            );
            return { message: 'RSVP successful' };
        } catch (err: any) {
            if (err.code === '23505') {
                return reply.code(409).send({ message: 'Already registered' });
            }
            throw err;
        }
    });

    // 5. Manual Sync Endpoint (for admin/testing)
    fastify.post('/sync', {
        schema: {
            tags: ['Events'],
            summary: 'Trigger manual event sync',
            description: 'Manually triggers synchronization from all event providers',
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
        const { EventSyncService } = await import('../../services/EventSyncService');
        const syncService = new EventSyncService(fastify.pg);

        // Run sync in background to avoid timeout
        syncService.syncAll().catch(err => {
            fastify.log.error(err, 'Background sync failed');
        });

        return reply.code(202).send({
            message: 'Sync started in background',
            status: 'accepted'
        });
    });
};

export default eventRoutes;
