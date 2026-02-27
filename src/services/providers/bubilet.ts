import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class BubiletProvider implements IEventProvider {
    name = 'Bubilet';

    async fetchEvents(): Promise<ProviderEvent[]> {
        try {
            // cityIds=34 is Istanbul
            const url = 'https://apiv3.bubilet.com.tr/event/trends?cityIds=34&count=100';
            const response = await axios.get(url);

            // Bubilet trends returns an array where the first element contains the events
            const data = response.data?.[0]?.events || [];

            return data.map((event: any): ProviderEvent => {
                // Determine category
                let category = 'General';
                const catName = event.category?.name?.toLowerCase();
                if (catName?.includes('konser')) category = 'Concert';
                if (catName?.includes('tiyatro')) category = 'Theater';
                if (catName?.includes('festival')) category = 'Festival';

                return {
                    title: event.name || 'Untitled Event',
                    description: `${event.name} at ${event.venues?.[0]?.name || 'Istanbul'}.`,
                    location: event.venues?.[0]?.name || 'Unknown Venue',
                    city: 'Istanbul',
                    category: category,
                    image_url: event.images?.[0]?.path,
                    start_time: event.dates?.[0]?.date,
                    source: 'bubilet',
                    external_id: event.id?.toString()
                };
            });

        } catch (err: any) {
            return [];
        }
    }
}
