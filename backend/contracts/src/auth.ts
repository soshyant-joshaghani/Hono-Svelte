import { z } from 'zod';

/** `application/x-www-form-urlencoded` body of POST /base/login/access-token. */
export const LoginFormSchema = z.object({
	username: z.string(),
	password: z.string()
});

export const TokenSchema = z.object({
	access_token: z.string(),
	token_type: z.literal('bearer')
});

export const UserPublicSchema = z.object({
	id: z.string().uuid(),
	email: z.string(),
	is_active: z.boolean(),
	is_superuser: z.boolean(),
	full_name: z.string().nullable()
});

export const UsersPublicSchema = z.object({
	data: z.array(UserPublicSchema),
	count: z.number().int()
});

export const UserCreateSchema = z.object({
	email: z.string().email().max(255),
	password: z.string().min(8).max(128),
	is_active: z.boolean().default(true),
	is_superuser: z.boolean().default(false),
	full_name: z.string().max(255).nullish()
});

export const UserUpdateSchema = z.object({
	email: z.string().email().max(255).optional(),
	password: z.string().min(8).max(128).optional(),
	full_name: z.string().max(255).nullish(),
	is_active: z.boolean().optional(),
	is_superuser: z.boolean().optional()
});

export const PrivateUserCreateSchema = z.object({
	email: z.string().max(255),
	password: z.string().min(8).max(128),
	full_name: z.string().max(255).nullish()
});

export const UserListQuerySchema = z.object({
	skip: z.coerce.number().int().min(0).default(0),
	limit: z.coerce.number().int().min(0).default(100)
});

export type LoginForm = z.infer<typeof LoginFormSchema>;
export type Token = z.infer<typeof TokenSchema>;
export type UserPublic = z.infer<typeof UserPublicSchema>;
export type UsersPublic = z.infer<typeof UsersPublicSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type PrivateUserCreate = z.infer<typeof PrivateUserCreateSchema>;
