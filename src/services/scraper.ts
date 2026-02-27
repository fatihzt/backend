import axios from 'axios';
import * as cheerio from 'cheerio';
import { FastifyInstance } from 'fastify';
import { LLMService } from './llm';
import { ProviderEvent } from './providers/types';

export class ScraperService {

    private static BASE_URL = 'https://allevents.in';

    /**
     * -----------------------------------------
     * 🔹 CITY BASED SCRAPER (KORUNDU)
     * -----------------------------------------
     * allevents.in/{city}
     */
    static async scrape(city: string, fastify?: FastifyInstance): Promise<ProviderEvent[]> {
        const citySlug = city.toLowerCase();

        const events: ProviderEvent[] = [];

        try {
            const { data } = await axios.get(`${this.BASE_URL}/${citySlug}`, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(data);
            const script = $('script[type="application/ld+json"]').html();

            if (!script) return [];

            const raw = JSON.parse(script.trim());
            const items = Array.isArray(raw) ? raw : [raw];

            for (const item of items) {
                if (item['@type'] !== 'Event') continue;

                const title = item.name?.trim();
                if (!title) continue;

                const description = item.description || title;
                const start_time = item.startDate;
                const end_time = item.endDate;
                const image_url = item.image;
                const location =
                    item.location?.name || `${citySlug} (Various)`;

                const category = LLMService.categorize(title, description);

                events.push({
                    title,
                    description,
                    location,
                    city: this.capitalize(citySlug),
                    category,
                    image_url,
                    start_time,
                    end_time,
                    source: 'scraper',
                    external_id: `${this.BASE_URL}/${citySlug}/${title}`
                });
            }

            if (fastify) {
                fastify.log.info(`Scraper: ${events.length} events from ${citySlug}`);
            }
            return events;

        } catch (err: any) {
            if (fastify) {
                fastify.log.error(`Scraper failed for city ${citySlug}: ${err.message}`);
            }
            return [];
        }
    }

    /**
     * -----------------------------------------
     * 🔥 FULL TURKEY SCRAPER (YENİ)
     * -----------------------------------------
     * allevents.in/turkey
     */
    static async scrapeAll(fastify?: FastifyInstance): Promise<ProviderEvent[]> {
        if (fastify) {
            fastify.log.info('Scraper: Discovering all TR cities');
        }

        const allEvents: ProviderEvent[] = [];
        const visitedCities = new Set<string>();

        try {
            const { data } = await axios.get(`${this.BASE_URL}/turkey`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const $ = cheerio.load(data);

            const cityLinks = $('a[href^="/"]').toArray();

            for (const el of cityLinks) {
                const href = $(el).attr('href');
                if (!href) continue;

                const city = href.replace('/', '').toLowerCase();

                // guards
                if (city.length < 3) continue;
                if (visitedCities.has(city)) continue;
                if (!/^[a-z-]+$/.test(city)) continue;

                visitedCities.add(city);

                try {
                    const cityEvents = await this.scrape(city, fastify);
                    allEvents.push(...cityEvents);
                } catch {
                    continue;
                }

                // polite crawling
                await this.sleep(300);
            }

        } catch (err: any) {
            if (fastify) {
                fastify.log.error(`Scraper failed to fetch TR cities: ${err.message}`);
            }
        }

        if (fastify) {
            fastify.log.info(`Scraper total events: ${allEvents.length}`);
        }
        return allEvents;
    }

    // -----------------------------------------
    // 🧠 Helpers
    // -----------------------------------------

    private static capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
