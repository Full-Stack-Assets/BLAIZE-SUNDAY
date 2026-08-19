# Songforge web — production image (non-Vercel)
# Build context MUST be monorepo root:
#   docker build -f apps/web/Dockerfile -t songforge-web .

FROM node:24-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Prove critical Lab files are in the image (fail fast if missing)
RUN test -f apps/web/components/SongLab.tsx \
 && test -f apps/web/components/ProjectCard.tsx \
 && test -f apps/web/components/ApprovalCard.tsx \
 && test -f apps/web/components/VideoLab.tsx \
 && test -f apps/web/lib/persistence.ts \
 && test -f apps/web/lib/forge.ts \
 && test -f apps/web/lib/video-service.server.ts \
 && ls -la apps/web/components apps/web/lib

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://songforge:songforge@localhost:5432/songforge?schema=public
RUN pnpm db:generate
WORKDIR /app/apps/web
RUN pnpm build

# ---------- runner ----------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl ffmpeg \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
