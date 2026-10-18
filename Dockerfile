# syntax=docker/dockerfile:1.7

# Keep the tag human-readable and the digest immutable. Dependabot updates both.
FROM node:26.12.0-alpine3.23@sha256:2ae3a23c9c5d2129398f4844c7c43400c061faf6973852f0fa837323bff9a5a8 AS builder

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

COPY . .

RUN npm run build \
    && npm prune --omit=dev --ignore-scripts \
    && npm cache clean --force

FROM node:26.12.0-alpine3.23@sha256:2ae3a23c9c5d2129398f4844c7c43400c061faf6973852f0fa837323bff9a5a8 AS production

WORKDIR /app

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/src/content/blog ./src/content/blog

ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production

EXPOSE 4321
STOPSIGNAL SIGTERM

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4321/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "./dist/server/entry.mjs"]
