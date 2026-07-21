# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
# COPY gateway.config.yaml ./gateway.config.yaml

# Install dependencies (including devDependencies for build)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
# COPY gateway.config.yaml ./gateway.config.yaml

# Build TypeScript
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001

# Copy package files and install production dependencies as root
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built app with correct ownership (avoids chown layer duplication)
COPY --chown=gateway:nodejs --from=builder /app/dist ./dist
# COPY --chown=gateway:nodejs --from=builder /app/gateway.config.yaml ./gateway.config.yaml
COPY --chown=gateway:nodejs --from=builder /app/src/config/system-prompt ./src/config/system-prompt

# Switch to non-root user (node_modules remain root:root, readable by all)
USER gateway

# Expose port
EXPOSE 3000

# Health check (readiness: HTTP 200 + body.status === 'ready')
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "\
    require('http').get('http://localhost:3000/api/v1/health/ready', (r) => { \
      let body = ''; \
      r.on('data', (c) => body += c); \
      r.on('end', () => { \
        try { \
          const j = JSON.parse(body); \
          process.exit(r.statusCode === 200 && j.status === 'ready' ? 0 : 1); \
        } catch { process.exit(1); } \
      }); \
    }).on('error', () => process.exit(1)); \
  "

# Start application
CMD ["node", "dist/main"]