# SongForge web production image. Build context MUST be the monorepo root.

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

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://songforge:songforge@localhost:5432/songforge?schema=public
RUN pnpm db:generate
WORKDIR /app/apps/web
RUN pnpm build

FROM node:24-alpine AS runner
ARG SONGFORGE_BUILD_SHA=unknown
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DISPLAY=:99
ENV HOME=/home/nextjs
ENV WHISPER_CLI_PATH=/usr/local/bin/whisper-cli
ENV WHISPER_MODEL_PATH=/models/ggml-base.en.bin
ENV SONGFORGE_BUILD_SHA=$SONGFORGE_BUILD_SHA

RUN apk add --no-cache \
      openssl ffmpeg libstdc++ ca-certificates \
      chromium xorg-server-xvfb x11vnc novnc websockify nginx tini su-exec \
      dbus font-noto \
 && npm install --global prisma@5.18.0 \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /home/nextjs /app/apps/web/docker /run/nginx \
 && chown -R nextjs:nodejs /home/nextjs

COPY --from=whisper-build /src/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=whisper-build /models/ggml-base.en.bin /models/ggml-base.en.bin
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY apps/web/docker/start.sh apps/web/docker/migrate.sh apps/web/docker/nginx.conf ./apps/web/docker/
RUN chmod 0755 /app/apps/web/docker/start.sh /app/apps/web/docker/migrate.sh \
 && chmod 0644 /app/apps/web/docker/nginx.conf

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/apps/web/docker/start.sh"]
