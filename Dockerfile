FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
# Full install (incl. dev deps) so `prisma generate` + `tsc` work.
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Strip dev deps from the build's node_modules so we can copy a lean tree
# into the runtime stage.
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl tini \
  && addgroup -S app && adduser -S app -G app

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./
COPY --from=builder --chown=app:app /app/prisma ./prisma

USER app

EXPOSE 3000

# Liveness probe against the DB-free /health endpoint. Orchestrators (compose,
# k8s) read this to gate traffic / restarts.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# tini reaps zombies and forwards SIGTERM cleanly to Node.
# `prisma` is a production dependency (see package.json), so `npx prisma` runs
# the CLI bundled in node_modules — no registry fetch at boot, works offline.
# For zero-downtime rollouts prefer running `migrate deploy` as a separate
# pre-deploy job and reducing this to `node dist/main` (see docs/AUDIT.md OPS-L6).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
