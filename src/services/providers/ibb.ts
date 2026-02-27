import axios from 'axios';
import { IEventProvider, ProviderEvent } from './types';

export class IBBProvider implements IEventProvider {
    name = 'IBB';

    async fetchEvents(): Promise<ProviderEvent[]> {
        try {
            const url = 'https://kultur.istanbul/wp-json/wp/v2/event_listing?per_page=50&_embed';
            const response = await axios.get(url);
            const posts = response.data || [];

            return posts.map((post: any): ProviderEvent => {
                // Extract metadata (dates, location)
                // Note: WordPress REST API stores custom fields in different ways depending on plugins.
                // For WP Event Manager, they might be in 'meta' or custom fields.

                const title = post.title?.rendered || 'No Title';
                const description = post.content?.rendered || '';
                const link = post.link;

                // WP Event Manager usually stores event data in these fields (heuristic)
                const startTime = post.event_start_date || post.date;
                const location = post._embedded?.['wp:term']?.find((t: any) => t[0]?.taxonomy === 'event_listing_category')?.[0]?.name || 'Istanbul';

                return {
                    title: title.replace(/<\/?[^>]+(>|$)/g, ""), // Strip HTML
                    description: description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 500) + '...',
                    location: 'Istanbul, Turkey', // Default for IBB
                    city: 'Istanbul',
                    category: 'Culture',
                    image_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
                    start_time: startTime,
                    source: 'ibb',
                    external_id: post.id.toString()
                };
            });

        } catch (err: any) {
            return [];
        }
    }
}
