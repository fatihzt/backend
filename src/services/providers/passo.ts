import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class PassoProvider implements IEventProvider {
    name = 'Passo';

    async fetchEvents(): Promise<ProviderEvent[]> {
        console.log('🎫 [PASSO] Fetching events for Istanbul and Ankara...');

        const cities = [
            { id: '101', name: 'Istanbul' },
            { id: '109', name: 'Ankara' }
        ];

        const allEvents: ProviderEvent[] = [];

        for (const city of cities) {
            try {
                const url = 'https://ticketingweb.passo.com.tr/api/passoweb/allevents';
                const response = await axios.post(url, {
                    CountRequired: true,
                    CityId: city.id,
                    LanguageId: 118,
                    from: 0,
                    size: 50
                });

                const events = response.data?.items || [];
                console.log(`🎫 [PASSO] Found ${events.length} events in ${city.name}.`);

                events.forEach((event: any) => {
                    allEvents.push({
                        title: event.name,
                        description: event.description || event.name,
                        location: event.venueName,
                        city: city.name,
                        category: event.categoryName || 'General',
                        image_url: event.imageUrl,
                        start_time: event.eventStartDate,
                        source: 'passo',
                        external_id: event.id.toString()
                    });
                });

            } catch (err: any) {
                console.error(`❌ [PASSO] Fetch failed for ${city.name}:`, err.message);
            }
        }

        return allEvents;
    }
}
