import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '../../../backend/src/core/queue.js';

const run = vi.hoisted(() => ({ fail: false }));

vi.mock('../../../backend/src/worker/tasks.js', async () => {
	const actual = await vi.importActual<typeof import('../../../backend/src/worker/tasks.js')>(
		'../../../backend/src/worker/tasks.js'
	);
	return {
		...actual,
		runTask: async (job: Job) => {
			if (run.fail) throw new Error('boom');
			return actual.runTask(job);
		}
	};
});

const { handlePayload } = await import('../../../backend/src/worker/handler.js');

const job = (overrides: Partial<Job> = {}): string =>
	JSON.stringify({
		id: '1',
		task: 'ping',
		args: { message: 'hi' },
		enqueued_at: new Date().toISOString(),
		...overrides
	});

describe('worker handlePayload', () => {
	let pushed: Job[];
	let logs: string[];
	const repush = async (next: Job) => {
		pushed.push(next);
	};

	beforeEach(() => {
		run.fail = false;
		pushed = [];
		logs = [];
		vi.spyOn(console, 'log').mockImplementation((line: string) => void logs.push(String(line)));
		vi.spyOn(console, 'error').mockImplementation((line: string) => void logs.push(String(line)));
	});

	it('runs ping and logs "ping job received: <message>"', async () => {
		await handlePayload(job(), repush);
		expect(logs.some((line) => line.includes('ping job received: hi'))).toBe(true);
		expect(pushed).toEqual([]);
	});

	it('logs and drops an unknown task', async () => {
		await handlePayload(job({ task: 'nope' }), repush);
		expect(logs.some((line) => line.includes('unknown task'))).toBe(true);
		expect(pushed).toEqual([]);
	});

	it('drops a malformed payload', async () => {
		await handlePayload('{not json', repush);
		expect(pushed).toEqual([]);
		expect(logs.some((line) => line.includes('malformed'))).toBe(true);
	});

	it('re-pushes a failed task with attempt n, up to 3 retries', async () => {
		run.fail = true;
		await handlePayload(job(), repush);
		expect(pushed.map((j) => j.attempt)).toEqual([1]);
		await handlePayload(job({ attempt: 2 }), repush);
		expect(pushed.map((j) => j.attempt)).toEqual([1, 3]);
		await handlePayload(job({ attempt: 3 }), repush);
		expect(pushed).toHaveLength(2);
		expect(logs.some((line) => line.includes('failed permanently'))).toBe(true);
	});
});
