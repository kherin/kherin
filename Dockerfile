# syntax=docker/dockerfile:1.7

ARG PUBLIC_KEYSTATIC_GITHUB_APP_SLUG

# Keep the tag human-readable and the digest immutable. Dependabot updates both.
FROM node:26.11.1-alpine3.23@sha256:f1394b3ffc021bc3f4aaf363e70a8d9667f7a9a63538bc824d7cc583129fffad AS builder

ARG PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
ENV PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=${PUBLIC_KEYSTATIC_GITHUB_APP_SLUG}

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

COPY . .

RUN case "${PUBLIC_KEYSTATIC_GITHUB_APP_SLUG}" in \
      ''|*[!a-z0-9-]*|-*|*-) echo 'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG must be a lowercase GitHub App slug' >&2; exit 1 ;; \
    esac \
    && npm run build \
    && npm prune --omit=dev --ignore-scripts \
    && npm cache clean --force

FROM node:26.11.1-alpine3.23@sha256:f1394b3ffc021bc3f4aaf363e70a8d9667f7a9a63538bc824d7cc583129fffad AS production

ARG PUBLIC_KEYSTATIC_GITHUB_APP_SLUG

WORKDIR /app

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/src/content/blog ./src/content/blog
COPY --chown=node:node --from=builder /app/public/images/blog ./public/images/blog

ENV HOST=0.0.0.0 \
    PORT=4321 \
    NODE_ENV=production \
    PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=${PUBLIC_KEYSTATIC_GITHUB_APP_SLUG}

EXPOSE 4321
STOPSIGNAL SIGTERM

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4321/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "./dist/server/entry.mjs"]
