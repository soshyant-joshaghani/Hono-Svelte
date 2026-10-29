import { randomUUID } from 'node:crypto';
import { redisClient } from './redis.js';

/** Redis list shared by every FoxG kit except Fast: API LPUSH, worker BRPOP. */
export const QUEUE_KEY = 'foxg:jobs';
/** A failed task is re-pushed at most this many times. */
export const MAX_RETRIES = 3;

export type Job = {
	id: string;
	task: string;
	args: Record<string, unknown>;
	enqueued_at: string;
	attempt?: number;
};

export interface JobQueue {
	/** Returns the job id. Throws an Error whose message is shown to the caller. */
	enqueue(task: string, args: Record<string, unknown>): Promise<string>;
}

export function newJob(task: string, args: Record<string, unknown>): Job {
	return { id: randomUUID(), task, args, enqueued_at: new Date().toISOString() };
}

export const redisJobQueue: JobQueue = {
	async enqueue(task, args) {
		const job = newJob(task, args);
		const redis = await redisClient();
		await redis.lpush(QUEUE_KEY, JSON.stringify(job));
		return job.id;
	}
};

let queue: JobQueue = redisJobQueue;

export function jobQueue(): JobQueue {
	return queue;
}

/** Test hook. Pass null to restore the Redis queue. */
export function setJobQueueForTests(next: JobQueue | null) {
	queue = next ?? redisJobQueue;
}
