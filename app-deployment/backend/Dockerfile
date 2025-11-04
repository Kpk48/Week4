# Backend Dockerfile - Unified API + Frontend (SPA) image, multi-stage, minimal, non-root
# IMPORTANT: Build context must be the repository root (contains package.json next to server.js)
# If you build from a subdirectory (like app-deployment/backend), Docker will not find package*.json.

# Stage 1: Install backend production deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Prefer reproducible ci; fall back to install if lockfile drift
RUN npm ci --only=production || npm install --omit=dev

# Stage 2: Build frontend (Vite)
FROM node:20-alpine AS web
WORKDIR /web
# Allow passing backend API base at build-time for the SPA
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# Stage 3: Prepare application files
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
# Backend deps
COPY --from=deps /app/node_modules ./node_modules
# Backend source
COPY server.js ./
COPY routes ./routes
COPY middleware ./middleware
COPY public ./public
COPY config ./config
COPY jwtkey.js ./jwtkey.js
COPY ai ./ai
# Include built frontend assets (if present)
COPY --from=web /web/dist ./frontend/dist

# Stage 4: Runtime - Distroless base for security
FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT; default to 3000 for local/docker
ENV PORT=3000
# Run as non-root (distroless default nonroot user)
USER nonroot:nonroot
# Copy app from build stage
COPY --from=build /app /app
EXPOSE 3000
# Healthcheck handled by platform; backend exposes /health
CMD ["server.js"]
