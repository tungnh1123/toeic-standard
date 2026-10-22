# -------------------------------------------------------------
# Multi-stage Dockerfile for NestJS Backend Production Build
# -------------------------------------------------------------

# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build tools for native dependencies if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build && npm prune --production

# -------------------------------------------------------------
# Stage 2: Production Runner
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Use existing non-root 'node' user for security
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node src/scripts/ ./dist/scripts/

EXPOSE 3000

CMD ["node", "dist/main.js"]

