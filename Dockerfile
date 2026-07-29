# ─── Stage 1: deps ──────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ──────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Payload requires PAYLOAD_SECRET and DATABASE_URI at build time for
# static page generation. We pass a dummy build-time secret — the real
# secret comes from .env at runtime.
ENV PAYLOAD_SECRET=build-time-placeholder-not-used-at-runtime
ENV DATABASE_URI=mongodb://localhost:27017/build-placeholder

# Build the Next.js standalone output
RUN pnpm build

# ─── Stage 3: runner ───────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create media directory for local uploads (when S3 is not configured)
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media
VOLUME /app/media

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
