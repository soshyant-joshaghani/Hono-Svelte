import { settings } from './core/config.js';
import { getDb } from './core/db.js';
import { log } from './core/logger.js';
import { hashPassword } from './core/security.js';
import { findUserByEmail, insertUser } from './modules/base/users/repository.js';

/** Create `FIRST_SUPERUSER` with `FIRST_SUPERUSER_PASSWORD` when it is missing. */
export async function seed() {
	const db = getDb();
	if (await findUserByEmail(db, settings.FIRST_SUPERUSER)) {
		log.info('superuser already present', { email: settings.FIRST_SUPERUSER });
		return;
	}
	await insertUser(db, {
		email: settings.FIRST_SUPERUSER,
		hashedPassword: await hashPassword(settings.FIRST_SUPERUSER_PASSWORD),
		isActive: true,
		isSuperuser: true,
		fullName: null
	});
	log.info('seeded superuser', { email: settings.FIRST_SUPERUSER });
}
