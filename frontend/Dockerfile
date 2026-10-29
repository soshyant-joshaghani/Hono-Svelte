# Build context is the kit root: compose uses `context: .` and `dockerfile: frontend/Dockerfile`.
FROM node:22-alpine AS build

WORKDIR /app

# The npm workspace root lists backend, backend/contracts and frontend, so all three
# manifests and the lock file are needed; only the frontend is installed.
COPY package.json package-lock.json ./
COPY backend/contracts/package.json backend/contracts/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci -w frontend

COPY frontend ./frontend

ARG PUBLIC_API_BASE_URL=/api/v1
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
ENV NODE_ENV=production

RUN npm run build -w frontend

FROM node:22-alpine AS production

WORKDIR /app

ARG PUBLIC_API_BASE_URL=/api/v1
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/frontend/package.json ./package.json
COPY --from=build /app/frontend/build ./build

EXPOSE 5000

CMD ["node", "build"]
