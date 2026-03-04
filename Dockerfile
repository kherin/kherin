# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (layer-cached if package.json unchanged)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build Astro (outputs to dist/)
RUN npm run build

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only bring in what's needed to run
COPY --from=builder /app/dist             ./dist
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package.json     ./
# Content dir so the CMS can read/write blog posts at runtime
COPY --from=builder /app/src/content      ./src/content

# Runtime environment
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321

# Health-check so docker-compose / orchestrators can monitor
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
