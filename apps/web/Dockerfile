# Songforge web — production image (non-Vercel)
# Build context MUST be monorepo root:
#   docker build -f apps/web/Dockerfile -t songforge-web .

# ---------- local Whisper runtime ----------
# Pin whisper.cpp so production caption alignment is reproducible. The model
# checksum is the upstream base.en SHA published by whisper.cpp.
FROM node:24-alpine AS whisper-build
ARG WHISPER_CPP_COMMIT=339f2b4e27d7c3b52f44a124a854abba507acff3
RUN apk add --no-cache build-base cmake git bash wget
WORKDIR /src
RUN git clone https://github.com/ggml-org/whisper.cpp.git whisper.cpp \
 && cd whisper.cpp \
 && git checkout "$WHISPER_CPP_COMMIT" \
 && cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
 && cmake --build build --config Release -j2 \
 && mkdir -p /models \
 && wget -q -O /models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin \
 && echo "137c40403d78fd54d454da0f9bd998f78703390c  /models/ggml-base.en.bin" | sha1sum -c -

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
ENV WHISPER_CLI_PATH=/usr/local/bin/whisper-cli
ENV WHISPER_MODEL_PATH=/models/ggml-base.en.bin

RUN apk add --no-cache openssl ffmpeg libstdc++ \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=whisper-build /src/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=whisper-build /models/ggml-base.en.bin /models/ggml-base.en.bin
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
