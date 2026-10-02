import { Redis } from 'ioredis';
import { settings } from '../core/config.js';
import { log } from '../core/logger.js';
import { QUEUE_KEY } from '../core/queue.js';
import { handlePayload } from './handler.js';

async function main() {
	// A dedicated connection: BRPOP blocks it, and it keeps retrying while Redis is down.
	const redis = new Redis({
		host: settings.REDIS_HOST,
		port: settings.REDIS_PORT,
		db: settings.REDIS_DB,
		password: settings.REDIS_PASSWORD || undefined,
		maxRetriesPerRequest: null
	});
	redis.on('error', (error) => log.error('redis error', { error: error.message }));

	let stopping = false;
	const stop = () => {
		stopping = true;
		redis.disconnect();
	};
	process.on('SIGINT', stop);
	process.on('SIGTERM', stop);

	log.info('worker started', { queue: QUEUE_KEY });
	while (!stopping) {
		try {
			const popped = await redis.brpop(QUEUE_KEY, 5);
			if (popped) await handlePayload(popped[1], (job) => redis.lpush(QUEUE_KEY, JSON.stringify(job)));
		} catch (error) {
			if (stopping) break;
			log.error('redis error, retrying in 2s', {
				error: error instanceof Error ? error.message : 'unknown'
			});
			await new Promise((resolve) => setTimeout(resolve, 2_000));
		}
	}
	log.info('worker stopped');
}

await main();
process.exit(0);
