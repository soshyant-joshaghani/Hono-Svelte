export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;

/** HTTP error rendered as `{"detail": "<message>"}`. */
export class ApiError extends Error {
	constructor(
		readonly status: ErrorStatus,
		message: string,
		readonly headers: Record<string, string> = {}
	) {
		super(message);
		this.name = 'ApiError';
	}

	static notAuthenticated() {
		return new ApiError(401, 'Not authenticated', { 'WWW-Authenticate': 'Bearer' });
	}

	static invalidCredentials() {
		return new ApiError(401, 'Could not validate credentials', { 'WWW-Authenticate': 'Bearer' });
	}
}
