import { createRoute } from '@hono/zod-openapi';
import {
	MessageSchema,
	NoteCreateSchema,
	NoteIdParamSchema,
	NotePublicSchema,
	NoteUpdateSchema
} from '@hono-svelte/contracts';
import { bearerAuth, createRouter, errorContent } from '../../../http.js';
import { requireUser } from '../../base/auth/deps.js';
import * as notes from './service.js';

const TAG = '[APPS] Sample';

const rootRoute = createRoute({
	method: 'get',
	path: '/',
	tags: [TAG],
	summary: 'Sample Root',
	responses: {
		200: {
			description: 'Sample module',
			content: { 'application/json': { schema: MessageSchema } }
		}
	}
});

const listRoute = createRoute({
	method: 'get',
	path: '/notes',
	tags: [TAG],
	summary: 'List Notes',
	security: bearerAuth,
	middleware: [requireUser] as const,
	responses: {
		200: {
			description: 'Notes owned by the caller',
			content: { 'application/json': { schema: NotePublicSchema.array() } }
		},
		401: { description: 'Not authenticated', content: errorContent }
	}
});

const createNoteRoute = createRoute({
	method: 'post',
	path: '/notes',
	tags: [TAG],
	summary: 'Create Note',
	security: bearerAuth,
	middleware: [requireUser] as const,
	request: {
		body: { content: { 'application/json': { schema: NoteCreateSchema } }, required: true }
	},
	responses: {
		201: {
			description: 'Created note',
			content: { 'application/json': { schema: NotePublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const readRoute = createRoute({
	method: 'get',
	path: '/notes/{id}',
	tags: [TAG],
	summary: 'Read Note',
	security: bearerAuth,
	middleware: [requireUser] as const,
	request: { params: NoteIdParamSchema },
	responses: {
		200: {
			description: 'Note',
			content: { 'application/json': { schema: NotePublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Not allowed to access this note', content: errorContent },
		404: { description: 'Note not found', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const updateRoute = createRoute({
	method: 'patch',
	path: '/notes/{id}',
	tags: [TAG],
	summary: 'Update Note',
	security: bearerAuth,
	middleware: [requireUser] as const,
	request: {
		params: NoteIdParamSchema,
		body: { content: { 'application/json': { schema: NoteUpdateSchema } }, required: true }
	},
	responses: {
		200: {
			description: 'Updated note',
			content: { 'application/json': { schema: NotePublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Not allowed to access this note', content: errorContent },
		404: { description: 'Note not found', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const deleteRoute = createRoute({
	method: 'delete',
	path: '/notes/{id}',
	tags: [TAG],
	summary: 'Delete Note',
	security: bearerAuth,
	middleware: [requireUser] as const,
	request: { params: NoteIdParamSchema },
	responses: {
		204: { description: 'Deleted' },
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Not allowed to access this note', content: errorContent },
		404: { description: 'Note not found', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

export const sampleRoutes = createRouter()
	.openapi(rootRoute, (c) =>
		c.json({ message: 'Sample module — see /sample/notes for the canonical CRUD example' }, 200)
	)
	.openapi(listRoute, async (c) => c.json(await notes.listNotes(c.get('user')), 200))
	.openapi(createNoteRoute, async (c) =>
		c.json(await notes.createNote(c.get('user'), c.req.valid('json')), 201)
	)
	.openapi(readRoute, async (c) =>
		c.json(await notes.getNote(c.get('user'), c.req.valid('param').id), 200)
	)
	.openapi(updateRoute, async (c) =>
		c.json(await notes.updateNote(c.get('user'), c.req.valid('param').id, c.req.valid('json')), 200)
	)
	.openapi(deleteRoute, async (c) => {
		await notes.deleteNote(c.get('user'), c.req.valid('param').id);
		return c.body(null, 204);
	});
