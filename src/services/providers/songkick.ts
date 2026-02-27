import axios from 'axios';
import * as cheerio from 'cheerio';
import { IEventProvider, ProviderEvent } from './types';

export class SongkickProvider implements IEventProvider {
    name = 'Songkick';

    async fetchEvents(): Promise<ProviderEvent[]> {
        try {
            // Istanbul metro area URL
            const url = 'https://www.songkick.com/metro-areas/28844-turkey-istanbul';
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const events: ProviderEvent[] = [];

            // Extract from JSON-LD
            $('script[type="application/ld+json"]').each((_, element) => {
                try {
                    const data = JSON.parse($(element).html() || '{}');

                    // Songkick usually has an array or a single object of type "MusicEvent"
                    const items = Array.isArray(data) ? data : [data];

                    for (const item of items) {
                        if (item['@type'] === 'MusicEvent') {
                            events.push({
                                title: item.name || 'Untitled Concert',
                                description: item.description || `Concert featuring ${item.performer?.[0]?.name || 'artists'}`,
                                location: item.location?.name || 'Unknown Venue',
                                city: 'Istanbul',
                                category: 'Concert',
                                image_url: item.image,
                                start_time: item.startDate,
                                end_time: item.endDate,
                                source: 'songkick',
                                external_id: item.url?.split('/').pop() || item.name,
                                lat: item.location?.geo?.latitude ? parseFloat(item.location.geo.latitude) : undefined,
                                lng: item.location?.geo?.longitude ? parseFloat(item.location.geo.longitude) : undefined
                            });
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            });

            return events;

        } catch (err: any) {
            return [];
        }
    }
}
