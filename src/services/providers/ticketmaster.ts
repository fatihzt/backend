import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class TicketmasterProvider implements IEventProvider {
    name = 'Ticketmaster';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async fetchEvents(): Promise<ProviderEvent[]> {
        try {
            const response = await axios.get(
                'https://app.ticketmaster.com/discovery/v2/events.json',
                {
                    params: {
                        apikey: this.apiKey,
                        countryCode: 'TR',
                        size: 200,
                        sort: 'date,asc'
                    }
                }
            );

            const events = response.data?._embedded?.events ?? [];

            return events.map((event: any): ProviderEvent => ({
                title: event.name,
                description: event.info || event.description || event.name,
                location: event._embedded?.venues?.[0]?.name ?? 'Unknown Venue',
                city: event._embedded?.venues?.[0]?.city?.name ?? 'Unknown',
                category: event.classifications?.[0]?.segment?.name ?? 'General',
                image_url: event.images?.[0]?.url,
                start_time: event.dates?.start?.dateTime
                    ?? event.dates?.start?.localDate,
                end_time: event.dates?.end?.dateTime,
                source: 'ticketmaster',
                external_id: event.id
            }));

        } catch (err: any) {
            return [];
        }
    }
}
