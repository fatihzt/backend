import axios from 'axios';
import * as cheerio from 'cheerio';
import { IEventProvider, ProviderEvent } from './types';
import { LLMService } from '../llm';

export class EtkinlikIoProvider implements IEventProvider {
    name = 'Etkinlik.io';

    constructor() { }

    async fetchEvents(): Promise<ProviderEvent[]> {
        console.log('📍 [ETKINLIK.IO] Scraping events from home page');

        try {
            const response = await axios.get('https://etkinlik.io/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const results: ProviderEvent[] = [];

            $('.ui.card.esitlebakalim-etkinlik').each((_, el) => {
                const $card = $(el);

                const title = $card.find('span[itemprop="name"]').first().text().trim();
                const image_url = $card.find('img[itemprop="image"]').attr('src');
                const start_iso = $card.find('meta[itemprop="startDate"]').attr('content');
                const end_iso = $card.find('meta[itemprop="endDate"]').attr('content');
                const venue = $card.find('[itemprop="location"] span[itemprop="name"]').first().text().trim();
                const city = $card.find('meta[itemprop="addressRegion"]').attr('content') || 'Unknown';
                const external_id = $card.find('a.header').attr('data-id') || '';

                // For the home page cards, the full description isn't available
                // We'll use the title as the description for now
                const description = title;

                if (title && start_iso) {
                    const category = LLMService.categorize(title, description);

                    results.push({
                        title,
                        description,
                        location: venue || 'Belirtilmemiş',
                        city,
                        category,
                        image_url: image_url || '',
                        start_time: start_iso,
                        end_time: end_iso,
                        source: 'etkinlik.io',
                        external_id: String(external_id)
                    });
                }
            });

            console.log(`✅ [ETKINLIK.IO] Scraped ${results.length} events`);
            return results;
        } catch (err: any) {
            console.error('❌ [ETKINLIK.IO] Scraping failed:', err.message);
            return [];
        }
    }
}
