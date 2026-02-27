import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { initDb } from './services/db';
import { EventSyncService } from './services/EventSyncService';

// Plugins
import dbPlugin from './plugins/db';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';
import swaggerPlugin from './plugins/swagger';

// Routes
import eventRoutes from './routes/events/index';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import rootRoutes from './routes/root';

dotenv.config();

const server = fastify({
    logger: true,
});

// Register Plugins
server.register(dbPlugin);
server.register(redisPlugin);
server.register(authPlugin);
server.register(swaggerPlugin);

// Middleware
server.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Rate limiting
server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
});

// Routes
server.register(rootRoutes);
server.register(authRoutes, { prefix: '/api/auth' });
server.register(eventRoutes, { prefix: '/api/events' });
server.register(adminRoutes, { prefix: '/api/admin' });
const notificationRoutes = require('./routes/notifications');
server.register(notificationRoutes, { prefix: '/api/notifications' });

// Health check
server.get('/health', async () => {
    return { status: 'ok' };
});

const start = async () => {
    try {
        // Wait for plugins to be ready
        await server.ready();

        // Initialize Database with consolidated pool
        await initDb(server.pg);

        // Start Sync Service with consolidated pool
        const syncService = new EventSyncService(server.pg);

        // Initial sync on startup (maybe not for dev, but let's do it once)
        server.log.info('Starting initial sync...');
        // await syncService.syncAll(); // Commented for faster startup, can trigger via POST /api/sync

        // Setup Cron Job (Every hour)
        cron.schedule('0 * * * *', () => {
            server.log.info('Running scheduled sync...');
            syncService.syncAll().catch(err => {
                server.log.error(err, 'Scheduled sync failed');
            });
        });

        const port = Number(process.env.PORT) || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`Server listening on http://localhost:${port}`);

    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
