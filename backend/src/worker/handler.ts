import { log } from '../core/logger.js';
import { MAX_RETRIES, type Job } from '../core/queue.js';
import { runTask, UnknownTaskError } from './tasks.js';

/** Handle one raw payload from the queue. Failed tasks are re-pushed up to MAX_RETRIES times. */
export async function handlePayload(raw: string, repush: (job: Job) => Promise<unknown>) {
	let job: Job;
	try {
		job = JSON.parse(raw) as Job;
		if (typeof job.task !== 'string') throw new Error('missing task');
	} catch (error) {
		log.error('dropping malformed job payload', {
			error: error instanceof Error ? error.message : 'unknown'
		});
		return;
	}
	try {
		await runTask(job);
		log.info('job done', { id: job.id, task: job.task });
	} catch (error) {
		if (error instanceof UnknownTaskError) {
			log.error('unknown task, dropped', { id: job.id, task: job.task });
			return;
		}
		const reason = error instanceof Error ? error.message : 'unknown';
		const attempt = job.attempt ?? 0;
		if (attempt < MAX_RETRIES) {
			log.error('job failed, retrying', { id: job.id, task: job.task, reason, attempt: attempt + 1 });
			await repush({ ...job, attempt: attempt + 1 });
		} else {
			log.error('job failed permanently', { id: job.id, task: job.task, reason });
		}
	}
}
