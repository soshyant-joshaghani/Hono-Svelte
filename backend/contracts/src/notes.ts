import { z } from 'zod';

// Length rules run on the raw value (like Fast); the service trims and rejects a blank title.
export const NoteCreateSchema = z.object({
	title: z.string().min(1).max(255),
	content: z.string().max(10000).default('')
});

export const NoteUpdateSchema = z.object({
	title: z.string().min(1).max(255).optional(),
	content: z.string().max(10000).optional()
});

export const NotePublicSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	content: z.string(),
	owner_id: z.string().uuid(),
	created_at: z.string(),
	updated_at: z.string()
});

export const NoteIdParamSchema = z.object({ id: z.string().uuid() });

export const JobPingQuerySchema = z.object({
	message: z.string().default('ping')
});

export const JobAcceptedSchema = z.object({
	job_id: z.string(),
	message: z.string()
});

export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NotePublic = z.infer<typeof NotePublicSchema>;
export type JobPingQuery = z.infer<typeof JobPingQuerySchema>;
export type JobAccepted = z.infer<typeof JobAcceptedSchema>;
