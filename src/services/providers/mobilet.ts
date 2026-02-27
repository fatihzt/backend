import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class MobiletProvider implements IEventProvider {
    name = 'Mobilet';

    async fetchEvents(): Promise<ProviderEvent[]> {
        try {
            const url = 'https://search.mobilet.com/indexes/event/search';
            const apiKey = process.env.MOBILET_API_KEY || '';

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
            return [];
        }
    }
}
