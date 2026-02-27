import { Pool } from 'pg';
import { IEventProvider } from './providers/types';
import { TicketmasterProvider } from './providers/ticketmaster';
import { IBBProvider } from './providers/ibb';
import { EtkinlikIoProvider } from './providers/etkinlik';
import { BubiletProvider } from './providers/bubilet';
import { MobiletProvider } from './providers/mobilet';
import { PassoProvider } from './providers/passo';
import { BiletixProvider } from './providers/biletix';
import { SongkickProvider } from './providers/songkick';

export class EventSyncService {
    private providers: IEventProvider[] = [
        new TicketmasterProvider(process.env.TICKETMASTER_KEY || ''),
        new IBBProvider(),
        new EtkinlikIoProvider(),
        new BubiletProvider(),
        new MobiletProvider(),
        new PassoProvider(),
        new BiletixProvider(),
        new SongkickProvider()
    ];
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async syncAll() {

        for (const provider of this.providers) {
            try {
                const events = await provider.fetchEvents();

                for (const event of events) {
                    await this.upsertEvent(event);
                }
            } catch (err: any) {
                // Error handling - could add logging here if needed
            }
        }
    }

    private async upsertEvent(event: any) {
        // System user ID for automated events
        const systemUserId = '00000000-0000-0000-0000-000000000000';
        
        const query = `
            INSERT INTO events (
                title, description, location, city, category, image_url, 
                start_time, end_time, source, external_id, lat, lng, creator_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (external_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                location = EXCLUDED.location,
                city = EXCLUDED.city,
                category = EXCLUDED.category,
                image_url = EXCLUDED.image_url,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                source = EXCLUDED.source,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng;
        `;

        const values = [
            event.title,
            event.description,
            event.location,
            event.city,
            event.category,
            event.image_url,
            event.start_time,
            event.end_time,
            event.source,
            event.external_id,
            event.lat,
            event.lng,
            systemUserId
        ];

        try {
            await this.pool.query(query, values);
        } catch (err: any) {
            throw err; // Re-throw to allow error handling upstream
        }
    }
}
