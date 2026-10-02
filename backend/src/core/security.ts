import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { settings } from './config.js';

const encoder = new TextEncoder();

/** bcrypt `$2b$` hash, readable by every FoxG backend. */
export function hashPassword(password: string) {
	return bcrypt.hash(password, settings.BCRYPT_COST);
}

export function verifyPassword(password: string, hashedPassword: string) {
	return bcrypt.compare(password, hashedPassword);
}

/** JWT HS256 with claims `sub` (user uuid) and `exp`. */
export function signAccessToken(userId: string) {
	const exp = Math.floor(Date.now() / 1000) + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60;
	return new SignJWT({})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(userId)
		.setExpirationTime(exp)
		.sign(encoder.encode(settings.SECRET_KEY));
}

/** Returns the `sub` claim, or throws when the token is invalid or expired. */
export async function readAccessToken(token: string) {
	const { payload } = await jwtVerify(token, encoder.encode(settings.SECRET_KEY), {
		algorithms: ['HS256']
	});
	if (typeof payload.sub !== 'string') throw new Error('token has no subject');
	return payload.sub;
}
