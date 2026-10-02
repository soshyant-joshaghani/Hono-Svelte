import { log } from '../core/logger.js';
import type { Job } from '../core/queue.js';

export class UnknownTaskError extends Error {}

type Task = (args: Record<string, unknown>) => Promise<void> | void;

/** Register app-specific tasks here. */
const tasks: Record<string, Task> = {
	ping: (args) => {
		const message = typeof args.message === 'string' ? args.message : 'pong';
		log.info(`ping job received: ${message}`);
	}
};

export async function runTask(job: Job) {
	const task = tasks[job.task];
	if (!task) throw new UnknownTaskError(job.task);
	await task(job.args ?? {});
}
