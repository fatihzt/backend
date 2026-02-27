import { FastifyInstance } from 'fastify';
import { TicketmasterProvider } from './providers/ticketmaster';
import { EtkinlikIoProvider } from './providers/etkinlik';
import { BiletixProvider } from './providers/biletix';
import { IBBProvider } from './providers/ibb';
import { ScraperService } from './scraper';
import { WorkerService } from './worker';

export class PipelineService {

    static async runIngestion(fastify: FastifyInstance) {
        fastify.log.info('Starting FULL TR ingestion');

        const providers = [
            new TicketmasterProvider(process.env.TICKETMASTER_KEY!),
            new EtkinlikIoProvider(),
            new BiletixProvider(),
            new IBBProvider()
        ];

        let total = 0;

        // --- API Providers
        for (const provider of providers) {
            fastify.log.info(`Running provider: ${provider.name}`);
            const events = await provider.fetchEvents();

            for (const event of events) {
                const res = await WorkerService.saveEvent(fastify, event);
                if (res.success) total++;
            }

            fastify.log.info(`Provider ${provider.name} completed: ${events.length} events`);
        }

        // --- Scraper (ALL)
        const scraped = await ScraperService.scrapeAll(fastify);
        for (const event of scraped) {
            const res = await WorkerService.saveEvent(fastify, event);
            if (res.success) total++;
        }
        fastify.log.info(`Scraper total: ${scraped.length}`);

        fastify.log.info(`Pipeline completed. New events: ${total}`);
        return total;
    }
}
