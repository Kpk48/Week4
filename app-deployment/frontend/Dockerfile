# Frontend Dockerfile - Build with Node, serve with Nginx (alpine), non-root
# Stage 1: Build static assets
FROM node:20-alpine AS build
WORKDIR /app

# Accept API base url at build time so Vite can inline it
ARG VITE_API_BASE_URL
ARG VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Nginx for static serving
FROM nginx:1.27-alpine AS runner

# Copy main nginx config that is non-root friendly
COPY app-deployment/frontend/nginx.main.conf /etc/nginx/nginx.conf
# Copy server block
COPY app-deployment/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user and fix permissions for Nginx runtime dirs
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /var/cache/nginx /var/run /var/log/nginx /run \
    && chown -R app:app /var/cache/nginx /var/run /var/log/nginx /run /usr/share/nginx /etc/nginx

USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/ || exit 1
CMD ["nginx","-g","daemon off;"]
