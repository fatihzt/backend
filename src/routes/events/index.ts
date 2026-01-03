
import { FastifyPluginAsync } from 'fastify';
import { listEventsSchema, createEventSchema, rsvpEventSchema, getEventSchema } from './events.schema';

// Simple In-Memory Cache Fallback
const memoryCache = new Map<string, { data: any, expiry: number }>();

const eventRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

    // 1. List all events (Filtering + Cache)
    fastify.get('/', {
        schema: listEventsSchema
    }, async (request, reply) => {
        const { city, category, search } = request.query as any;

        // Cache Key
        const cacheKey = `events:${city || 'all'}:${category || 'all'}:${search || 'none'}`;

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

        // Build Query
        let query = 'SELECT *, (SELECT full_name FROM users WHERE id = creator_id) as creator_name FROM events WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (city) {
            query += ` AND city = $${paramIndex}`;
            params.push(city);
            paramIndex++;
        }
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        if (search) {
            query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY start_time ASC';

        let rows;
        try {
            const result = await fastify.pg.query(query, params);
            rows = result.rows;
        } catch (err: any) {
            fastify.log.error(err, 'Database query failed');
            return reply.code(500).send({ 
                error: 'Failed to fetch events',
                message: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }

        // Save to Cache (5 Minutes)
        if (fastify.redis) {
            try {
                // Correct Upstash Redis syntax: set(key, value, { ex: seconds })
                await fastify.redis.set(cacheKey, JSON.stringify(rows), { ex: 300 });
            } catch (err) {
                fastify.log.error(err, 'Redis write failed');
            }
        } else {
            memoryCache.set(cacheKey, { data: rows, expiry: Date.now() + 300000 });
        }

        return rows;
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

        // Invalidate Cache
        if (fastify.redis) {
            try {
                const keys = await fastify.redis.keys('events:*');
                if (keys.length > 0) await fastify.redis.del(...keys);
            } catch (err) {
                fastify.log.error(err, 'Redis cache invalidation failed');
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
            response: {
                202: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { EventSyncService } = await import('../../services/EventSyncService');
        const syncService = new EventSyncService();

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
