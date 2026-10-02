import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { settings } from './core/config.js';
import { ApiError } from './core/errors.js';
import { log } from './core/logger.js';
import { createRouter, SECURITY_SCHEME } from './http.js';
import { sampleRoutes } from './modules/apps/sample/router.js';
import { baseRoutes } from './modules/base/router.js';
import { privateRoutes } from './modules/system/private.js';
import { systemRoutes } from './modules/system/router.js';

const API = settings.API_V1_STR;
const OPENAPI_URL = `${API}/openapi.json`;

const api = createRouter()
	.route('/utils', systemRoutes)
	.route('/base', baseRoutes)
	.route('/sample', sampleRoutes);

// `/private/*` exists only when ENVIRONMENT=local.
const routedApi = settings.ENVIRONMENT === 'local' ? api.route('/private', privateRoutes) : api;

export const app = createRouter();

if (settings.corsOrigins.length > 0) {
	app.use('*', cors({ origin: settings.corsOrigins, credentials: true }));
}

app.route(API, routedApi);

app.onError((error, c) => {
	if (error instanceof ApiError) {
		return c.json({ detail: error.message }, error.status, error.headers);
	}
	if (error instanceof HTTPException) {
		// A body that cannot be parsed, or has the wrong content type, is a validation failure (422), like FastAPI.
		const unparsable = error.status === 415 || (error.status === 400 && /malformed/i.test(error.message));
		const status = unparsable ? 422 : error.status;
		return c.json({ detail: error.message || 'Error' }, status);
	}
	log.error('unhandled error', { error: error instanceof Error ? error.message : 'unknown' });
	return c.json({ detail: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ detail: 'Not Found' }, 404));

app.openAPIRegistry.registerComponent('securitySchemes', SECURITY_SCHEME, {
	type: 'oauth2',
	flows: { password: { tokenUrl: `${API}/base/login/access-token`, scopes: {} } }
});

app.doc(OPENAPI_URL, {
	openapi: '3.0.0',
	info: { title: settings.PROJECT_NAME, version: '0.1.0' }
});

app.get('/docs', (c) =>
	c.html(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${settings.PROJECT_NAME} - Swagger UI</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '${OPENAPI_URL}', dom_id: '#swagger-ui', persistAuthorization: true })</script>
</body>
</html>`)
);

app.get(
	'/sdoc',
	apiReference({
		url: OPENAPI_URL,
		pageTitle: settings.PROJECT_NAME,
		theme: 'elysiajs',
		layout: 'modern',
		showSidebar: true,
		showDeveloperTools: 'localhost',
		persistAuth: true,
		hideClientButton: false,
		hideModels: false,
		hideSearch: false,
		hideTestRequestButton: false,
		hideDarkModeToggle: false,
		withDefaultFonts: true,
		documentDownloadType: 'both',
		showToolbar: 'localhost',
		operationTitleSource: 'summary',
		defaultOpenFirstTag: true,
		authentication: { preferredSecurityScheme: SECURITY_SCHEME },
		agent: { disabled: true }
	} as Parameters<typeof apiReference>[0])
);
