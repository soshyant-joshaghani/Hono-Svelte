# Build context is the kit root: compose uses `context: .` and `dockerfile: backend/Dockerfile`.
# One image runs both processes: the API (default CMD) and the worker
# (`node backend/dist/worker/worker.js`).
FROM node:22-alpine
WORKDIR /app

# Manifests first so the install layer is cached. The lock file covers the whole workspace.
COPY package.json package-lock.json ./
COPY backend/contracts/package.json backend/contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend

COPY backend/contracts backend/contracts
COPY backend backend
RUN npm run build -w @hono-svelte/contracts && npm run build -w @hono-svelte/backend

ENV NODE_ENV=production
USER node
EXPOSE 8000
CMD ["node", "backend/dist/index.js"]
