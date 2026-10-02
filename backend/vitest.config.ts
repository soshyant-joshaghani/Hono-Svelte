import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		fileParallelism: false,
		include: ['../tests/backend/**/*.test.ts'],
		setupFiles: ['../tests/backend/setup.ts'],
		// Set before any module loads, so `core/config.ts` sees them. They also win over a .env file.
		env: {
			ENVIRONMENT: 'local',
			SECRET_KEY: 'test-secret-key',
			FIRST_SUPERUSER: 'admin@example.com',
			FIRST_SUPERUSER_PASSWORD: 'adminpass123',
			BACKEND_CORS_ORIGINS: 'http://localhost:5000',
			FRONTEND_HOST: 'http://dashboard.localhost',
			BCRYPT_COST: '4',
			REDIS_DISABLED: '1'
		}
	}
});
