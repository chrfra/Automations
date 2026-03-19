# Stage 1: Build Vite client
FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Fastify server
FROM node:22-alpine AS server-build
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy server production dependencies
COPY --from=server-build /app/package*.json ./
RUN npm ci --omit=dev

# Copy built server output
COPY --from=server-build /app/dist ./dist

# Copy built Vite output (Fastify serves it as static files)
COPY --from=client-build /app/dist ./client/dist

# Data directory (DB + key will be volume-mounted)
RUN mkdir -p data/secrets

EXPOSE 3000

CMD ["node", "dist/index.js"]
