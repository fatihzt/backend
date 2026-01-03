import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class MobiletProvider implements IEventProvider {
    name = 'Mobilet';

    async fetchEvents(): Promise<ProviderEvent[]> {
        console.log('📱 [MOBILET] Fetching events from MeiliSearch...');

        try {
            const url = 'https://search.mobilet.com/indexes/event/search';
            const apiKey = 'a63d121547b0d950de3df57bba212d74a37a45973ee4cb07038f1ba8bc1bcd7d';

            const response = await axios.post(url, {
                q: '',
                filter: 'cities = "İstanbul"',
                limit: 100,
                sort: ['eventStartDate:asc']
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const hits = response.data.hits || [];
            console.log(`📱 [MOBILET] Found ${hits.length} events.`);

            return hits.map((hit: any): ProviderEvent => {
                return {
                    title: hit.eventName,
                    description: hit.eventSubtitle || hit.eventName,
                    location: hit.locationName,
                    city: 'Istanbul',
                    category: hit.categoryName || 'General',
                    image_url: hit.eventHorizontalImage,
                    start_time: hit.eventStartDate,
                    end_time: hit.eventEndDate,
                    source: 'mobilet',
                    external_id: hit.id.toString()
                };
            });

        } catch (err: any) {
            console.error('❌ [MOBILET] Fetch failed:', err.message);
            return [];
        }
    }
}
