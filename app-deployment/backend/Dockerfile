# Backend Dockerfile - Multi-stage, minimal, non-root
# Stage 1: Build dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Install dependencies only (leverage Docker layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Copy source (no dev deps) and prune
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
# Copy only necessary files
COPY server.js ./
COPY routes ./routes
COPY middleware ./middleware
COPY public ./public
COPY config ./config
COPY jwtkey.js ./jwtkey.js
# Optional: Include frontend build if baked in image (compose will build separately too)
# We keep ability to serve built assets if present
COPY frontend/package.json ./frontend/package.json

# Stage 3: Runtime - Distroless base for security
# Using gcr.io/distroless/nodejs20-debian12 as minimal runtime with node
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Create non-root user (distroless runs as nonroot by default when user is nonroot)
USER nonroot:nonroot
# Copy app from build stage
COPY --from=build /app /app
EXPOSE 3000
# Healthcheck is defined in docker-compose; Cloud Run will use /health
CMD ["server.js"]
