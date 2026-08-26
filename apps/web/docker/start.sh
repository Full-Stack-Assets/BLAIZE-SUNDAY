#!/bin/sh
set -eu

umask 077

STATE_ROOT="${ROUTENOTE_STATE_ROOT:-/data/.songforge/routenote}"
PROFILE_DIR="${ROUTENOTE_PROFILE_DIR:-$STATE_ROOT/browser-profile}"
CACHE_DIR="$STATE_ROOT/cache"
RECEIPT_DIR="$STATE_ROOT/receipts"
MEDIA_ROOT="${ROUTENOTE_MEDIA_ROOT:-/data/media}"

for path in "$STATE_ROOT" "$PROFILE_DIR" "$CACHE_DIR" "$RECEIPT_DIR" "$MEDIA_ROOT"; do
  if [ -L "$path" ]; then
    echo "RouteNote storage policy rejected a symbolic-link directory" >&2
    exit 1
  fi
  mkdir -p "$path"
  chown nextjs:nodejs "$path"
  chmod 0700 "$path"
done

minimal_env() {
  env -i \
    PATH="$PATH" \
    HOME=/home/nextjs \
    USER=nextjs \
    LOGNAME=nextjs \
    LANG="${LANG:-C.UTF-8}" \
    DISPLAY=:99 \
    "$@"
}

pids=""
cleanup() {
  for pid in $pids; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM HUP

su-exec nextjs:nodejs sh -c 'exec env -i PATH="$1" HOME=/home/nextjs USER=nextjs LOGNAME=nextjs LANG="${2:-C.UTF-8}" Xvfb :99 -screen 0 1440x900x24 -nolisten tcp -ac' sh "$PATH" "${LANG:-C.UTF-8}" >/tmp/songforge-xvfb.log 2>&1 &
pids="$pids $!"
sleep 1

su-exec nextjs:nodejs sh -c 'exec env -i PATH="$1" HOME=/home/nextjs USER=nextjs LOGNAME=nextjs LANG="${2:-C.UTF-8}" DISPLAY=:99 x11vnc -display :99 -rfbport 5900 -localhost -forever -shared -nopw -noxdamage' sh "$PATH" "${LANG:-C.UTF-8}" >/tmp/songforge-x11vnc.log 2>&1 &
pids="$pids $!"

su-exec nextjs:nodejs sh -c 'exec env -i PATH="$1" HOME=/home/nextjs USER=nextjs LOGNAME=nextjs LANG="${2:-C.UTF-8}" websockify --web=/usr/share/novnc 127.0.0.1:6080 127.0.0.1:5900' sh "$PATH" "${LANG:-C.UTF-8}" >/tmp/songforge-websockify.log 2>&1 &
pids="$pids $!"

PORT=3001 HOSTNAME=127.0.0.1 su-exec nextjs:nodejs node /app/apps/web/server.js >/tmp/songforge-next.log 2>&1 &
app_pid=$!
pids="$pids $app_pid"

for _ in $(seq 1 60); do
  if wget -q -O /dev/null http://127.0.0.1:3001/api/health/live 2>/dev/null; then
    break
  fi
  if ! kill -0 "$app_pid" 2>/dev/null; then
    cat /tmp/songforge-next.log >&2 || true
    exit 1
  fi
  sleep 1
done

if ! wget -q -O /dev/null http://127.0.0.1:3001/api/health/live 2>/dev/null; then
  cat /tmp/songforge-next.log >&2 || true
  exit 1
fi

env -i PATH="$PATH" nginx -c /app/apps/web/docker/nginx.conf -g 'daemon off;' >/tmp/songforge-nginx.log 2>&1 &
nginx_pid=$!
pids="$pids $nginx_pid"

wait "$app_pid"
status=$?
cat /tmp/songforge-next.log >&2 || true
exit "$status"
