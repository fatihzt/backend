import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class BiletixProvider implements IEventProvider {
    name = 'Biletix';

    async fetchEvents(): Promise<ProviderEvent[]> {
        console.log('🎫 [BILETIX] Fetching events from Solr endpoint...');

        try {
            // Get today and a date in the future for the query
            const now = new Date();
            const future = new Date();
            future.setMonth(now.getMonth() + 3); // Fetch next 3 months

            const formatDate = (date: Date) => date.toISOString().split('.')[0] + 'Z';

            const startStr = formatDate(now);
            const endStr = formatDate(future);

            const url = `https://www.biletix.com/solr/tr/select/?start=0&rows=100&q=*:*&fq=start%3A%5B${encodeURIComponent(startStr)}%20TO%20${encodeURIComponent(endStr)}%2B1DAY%5D&sort=score%20desc,start%20asc&wt=json`;

            const response = await axios.get(url);
            const docs = response.data?.response?.docs ?? [];

            console.log(`🎫 [BILETIX] Found ${docs.length} events.`);

            return docs.map((doc: any): ProviderEvent => {
                // Determine category
                let category = 'General';
                if (doc.category) {
                    category = Array.isArray(doc.category) ? doc.category[0] : doc.category;
                }

                return {
                    title: doc.event || 'No Title',
                    description: doc.description || doc.event_name_tr || '',
                    location: doc.venue || 'Unknown Venue',
                    city: doc.city || 'Unknown City',
                    category: category,
                    image_url: doc.image_url ? `https://www.biletix.com${doc.image_url}` : undefined,
                    start_time: doc.start,
                    end_time: doc.end,
                    source: 'biletix',
                    external_id: doc.id
                };
            });

        } catch (err: any) {
            console.error('❌ [BILETIX] Fetch failed:', err.message);
            return [];
        }
    }
}
