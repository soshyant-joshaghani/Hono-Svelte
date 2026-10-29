import { z } from 'zod';

/** Error body: `{"detail": "<message>"}`. */
export const DetailSchema = z.object({
	detail: z.string()
});

export const MessageSchema = z.object({
	message: z.string()
});

export type Detail = z.infer<typeof DetailSchema>;
export type Message = z.infer<typeof MessageSchema>;
