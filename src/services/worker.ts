
import { FastifyInstance } from 'fastify';
import { getQueue } from './queue';
import { NotificationService } from './notification';
import { LLMService } from './llm';
import { GeoService } from './geo';

export class WorkerService {

    // Save a single event to DB with deduplication
    static async saveEvent(fastify: FastifyInstance, eventData: any) {
        const fAny = fastify as any;
        try {
            // 1. Smart Deduplication Check
            const cleanTitle = eventData.title.trim();

            // Fetch potential duplicates (same city, same date)
            const resultExisting = await fAny.pg.query(
                'SELECT title, start_time FROM events WHERE city = $1 AND start_time = $2',
                [eventData.city, eventData.start_time]
            );

            for (const existing of resultExisting.rows) {
                if (await LLMService.isDuplicate(eventData, existing)) {
                    fastify.log.info(`Duplicate detected: "${cleanTitle}" matches "${existing.title}"`);
                    return { skipped: true };
                }
            }

            // 2. Geo Enrichment
            let lat = null;
            let lng = null;
            if (eventData.location && eventData.city) {
                const geo = await GeoService.geocode(eventData.location, eventData.city);
                if (geo) {
                    lat = geo.lat;
                    lng = geo.lng;
                }
            }

            // 3. Category Enrichment (LLM)
            const category = LLMService.categorize(eventData.title, eventData.description || '');

            // 4. Get system user (UUID: 00000000-0000-0000-0000-000000000000)
            const systemUserId = '00000000-0000-0000-0000-000000000000';
            const userResult = await fAny.pg.query('SELECT id FROM users WHERE id = $1', [systemUserId]);
            
            let creatorId = userResult.rows[0]?.id;
            
            // Fallback: if system user doesn't exist, use first user or create system user
            if (!creatorId) {
                const fallbackResult = await fAny.pg.query('SELECT id FROM users LIMIT 1');
                creatorId = fallbackResult.rows[0]?.id;
                
                if (!creatorId) {
                    // Create system user as last resort
                    await fAny.pg.query(`
                        INSERT INTO users (id, email, password_hash, full_name)
                        VALUES ($1, 'system@eventapp.com', '$2b$10$dummyhashfornologin', 'System User')
                        ON CONFLICT (id) DO NOTHING
                    `, [systemUserId]);
                    creatorId = systemUserId;
                }
            }

            // 5. Save to DB
            const result = await fAny.pg.query(
                `INSERT INTO events (title, description, location, city, category, start_time, end_time, creator_id, image_url, source, lat, lng) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                 RETURNING id, title, city`,
                [
                    cleanTitle,
                    eventData.description,
                    eventData.location,
                    eventData.city,
                    category,
                    eventData.start_time,
                    eventData.end_time,
                    creatorId,
                    eventData.image_url,
                    eventData.source || 'Scraper',
                    lat,
                    lng
                ]
            );

            const savedEvent = result.rows[0];

            // 6. Send Notifications
            await NotificationService.broadcast(savedEvent.city, {
                title: `New Event in ${savedEvent.city}!`,
                body: savedEvent.title,
                data: { eventId: savedEvent.id }
            }, fAny.pg);

            return { success: true, event: savedEvent };

        } catch (err) {
            fastify.log.error(err, 'Worker save failed');
            return { error: err };
        }
    }

    // Process a single job from the queue (for legacy/background fallback)
    static async processNextJob(fastify: FastifyInstance) {
        const fAny = fastify as any;
        const queue = getQueue(fAny.redis);
        const eventData = await queue.popFromQueue();

        if (!eventData) return false;

        const result = await this.saveEvent(fastify, eventData);
        return !!result.success || !!result.skipped;
    }

    static async processAll(fastify: FastifyInstance) {
        fastify.log.info('Processing queue...');
        let processed = 0;
        while (true) {
            const success = await this.processNextJob(fastify);
            if (!success) break;
            processed++;
        }
        fastify.log.info(`Queue processing done. Processed ${processed} jobs.`);
        return processed;
    }
}
