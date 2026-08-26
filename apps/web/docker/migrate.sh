#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required for production migrations" >&2
  exit 1
fi

exec prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
