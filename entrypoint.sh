#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC2086

GLUETUN_API="http://127.0.0.1:8000/v1/portforward"
CHECK_INTERVAL=60
MAX_WAIT=30

ACE_CMD="/app/start-engine"
ACE_PID=""
CURRENT_PORT=""

if [[ "${ALLOW_REMOTE_ACCESS:-}" == "yes" ]]; then
  EXTRA_FLAGS+=" --bind-all"
else
  EXTRA_FLAGS+=""
fi



log() {
  echo "[entrypoint] $*"
}
--cache-max-bytes

cache_argument=""
# Check acestream cache size if it exists
if [[ -d "/acestream-cache" ]]; then
  CACHE_SIZE="$(df -h /acestream-cache | awk 'NR==2 {print int($2)}')"
  log "AceStream cache size: ${CACHE_SIZE}GB"
  cache_size_bytes=$((CACHE_SIZE * 1024 * 1024 * 1024 * 80 / 100)) # Use 80% of the cache size
  cache_argument=" --cache-dir /acestream-cache --cache-max-bytes ${cache_size_bytes}"
fi

get_vpn_port() {
  curl -sf "${GLUETUN_API}" | jq -r '.port // empty'
}

start_acestream() {
  local p2p="$1"
  log "Starting AceStream on port ${p2p}"
  $ACE_CMD --client-console --port "${p2p}" $cache_argument --log-stdout --log-stdout-level any --disable-sentry $EXTRA_FLAGS &
  ACE_PID=$!
  CURRENT_PORT="$p2p"
}

stop_acestream() {
  if [[ -n "${ACE_PID}" ]] && kill -0 "${ACE_PID}" 2>/dev/null; then
    log "Stopping AceStream (pid ${ACE_PID})"
    kill "${ACE_PID}"
    wait "${ACE_PID}" 2>/dev/null || true
  fi
  ACE_PID=""
}

### 1) Wait Gluetun port for max 30s
log "Waiting up to ${MAX_WAIT}s for Gluetun forwarded port..."

START_TS=$(date +%s)

while true; do
  VPN_PORT="$(get_vpn_port || true)"
  if [[ -n "${VPN_PORT}" ]]; then
    log "Received initial VPN port: ${VPN_PORT}"
    break
  fi

  NOW_TS=$(date +%s)
  if (( NOW_TS - START_TS >= MAX_WAIT )); then
    log "ERROR: Timed out waiting for Gluetun port"
    exit 1
  fi

  sleep 2
done

### 2) First start with p2p port
start_acestream "${VPN_PORT}"

### 3) Watch for p2p port
while true; do
  sleep "${CHECK_INTERVAL}"

  NEW_PORT="$(get_vpn_port || true)"
  [[ -z "${NEW_PORT}" ]] && continue

  if [[ "${NEW_PORT}" != "${CURRENT_PORT}" ]]; then
    log "Port change detected: ${CURRENT_PORT} -> ${NEW_PORT}"
    stop_acestream
    start_acestream "${NEW_PORT}"
  fi
done
