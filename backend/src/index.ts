import { serve } from '@hono/node-server';
import { app } from './app.js';
import { settings } from './core/config.js';
import { closeDb } from './core/db.js';
import { log } from './core/logger.js';
import { closeRedis } from './core/redis.js';
import { migrate } from './db/migrate.js';
import { seed } from './seed.js';

await migrate();
await seed();

const server = serve({ fetch: app.fetch, hostname: settings.APP_HOST, port: settings.APP_PORT }, (info) => {
	log.info('api listening', { port: info.port, environment: settings.ENVIRONMENT });
});

async function shutdown() {
	log.info('shutting down');
	server.close();
	await closeRedis();
	await closeDb();
	process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
