import { Redis } from 'ioredis';
import { settings } from './config.js';
import { log } from './logger.js';

type RedisClient = InstanceType<typeof Redis>;

let client: RedisClient | null = null;
let unavailableUntil = 0;

export function redisDisabled() {
	return process.env.REDIS_DISABLED === '1';
}

function connectionOptions() {
	return {
		host: settings.REDIS_HOST,
		port: settings.REDIS_PORT,
		db: settings.REDIS_DB,
		password: settings.REDIS_PASSWORD || undefined,
		maxRetriesPerRequest: 1,
		connectTimeout: 500,
		commandTimeout: 1000,
		enableOfflineQueue: false,
		lazyConnect: true
	};
}

/** Shared connection. Throws when Redis cannot be reached. */
export async function redisClient(): Promise<RedisClient> {
	if (redisDisabled()) throw new Error('Redis is disabled');
	if (!client || client.status === 'end') {
		client = new Redis(connectionOptions());
		client.on('error', () => {
			unavailableUntil = Date.now() + 5_000;
		});
	}
	if (client.status === 'wait') await client.connect();
	return client;
}

/** Cache calls use this: a failure becomes a no-op and pauses retries for 5 s. */
async function soft<T>(fallback: T, run: (redis: RedisClient) => Promise<T>): Promise<T> {
	if (redisDisabled() || Date.now() < unavailableUntil) return fallback;
	try {
		return await run(await redisClient());
	} catch (error) {
		unavailableUntil = Date.now() + 5_000;
		log.info('redis unavailable; continuing without cache', {
			error: error instanceof Error ? error.message : 'unknown'
		});
		return fallback;
	}
}

export function redisReachable() {
	return soft(false, async (redis) => (await redis.ping()) === 'PONG');
}

export function cacheGet<T>(key: string): Promise<T | null> {
	return soft<T | null>(null, async (redis) => {
		const raw = await redis.get(key);
		return raw ? (JSON.parse(raw) as T) : null;
	});
}

export function cacheSet(key: string, value: unknown, ttlSeconds: number) {
	return soft<void>(undefined, async (redis) => {
		await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
	});
}

export function cacheDelete(key: string) {
	return soft<void>(undefined, async (redis) => {
		await redis.del(key);
	});
}

/** Delete every key that starts with `prefix` (SCAN, never KEYS). */
export function cacheDeletePrefix(prefix: string) {
	return soft<void>(undefined, async (redis) => {
		let cursor = '0';
		do {
			const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
			cursor = next;
			if (keys.length > 0) await redis.del(...keys);
		} while (cursor !== '0');
	});
}

export async function closeRedis() {
	await client?.quit().catch(() => client?.disconnect());
	client = null;
}
