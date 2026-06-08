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

# tini reaps zombies and forwards SIGTERM cleanly to Node.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
