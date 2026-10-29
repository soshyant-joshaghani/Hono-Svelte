import { createRouter } from '../../http.js';
import { authRoutes } from './auth/router.js';
import { userRoutes } from './users/router.js';

/** Mounted at `/base`: `/login/*` and `/users/*`. */
export const baseRoutes = createRouter().route('/', authRoutes).route('/', userRoutes);
