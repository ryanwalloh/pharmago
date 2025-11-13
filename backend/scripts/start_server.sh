#!/bin/bash
set -euo pipefail

REDIS_CLI_ARGS=()

build_redis_cli_args() {
  if [[ -n "${REDIS_URL:-}" ]]; then
    REDIS_CLI_ARGS=(-u "$REDIS_URL")
    return 0
  fi

  if [[ -n "${REDIS_HOST:-}" ]] && [[ -n "${REDIS_PORT:-}" ]]; then
    REDIS_CLI_ARGS=(-h "$REDIS_HOST" -p "$REDIS_PORT")
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
      REDIS_CLI_ARGS+=(-a "$REDIS_PASSWORD")
    fi
    return 0
  fi

  echo "Redis connection details not provided; skipping Redis operations."
  return 1
}

flush_redis_cache() {
  local scope="${FLUSH_REDIS_SCOPE:-all}"
  local command

  case "${scope,,}" in
    db)
      command="FLUSHDB"
      ;;
    all|"")
      command="FLUSHALL"
      ;;
    *)
      echo "Unknown FLUSH_REDIS_SCOPE value '${FLUSH_REDIS_SCOPE}'. Expected 'all' or 'db'." >&2
      return 1
      ;;
  esac

  if redis-cli "${REDIS_CLI_ARGS[@]}" "${command}"; then
    echo "Redis cache cleared using ${command}."
    return 0
  fi

  echo "Warning: failed to clear Redis cache with ${command}." >&2
  return 1
}

configure_redis_snapshot_policy() {
  local attempt

  for attempt in {1..5}; do
    if redis-cli "${REDIS_CLI_ARGS[@]}" CONFIG SET save "86400 1"; then
      echo "Redis snapshot policy set to once per day (86400 seconds)."
      return 0
    fi
    if [[ $attempt -eq 5 ]]; then
      echo "Warning: failed to configure Redis snapshot policy after ${attempt} attempts." >&2
      return 1
    fi
    echo "Redis not ready (attempt ${attempt}); retrying in 5 seconds..."
    sleep 5
  done
}

if build_redis_cli_args; then
  if [[ "${FLUSH_REDIS_ON_START:-0}" == "1" ]]; then
    if ! flush_redis_cache; then
      echo "Proceeding without clearing Redis cache." >&2
    fi
  fi

  if ! configure_redis_snapshot_policy; then
    echo "Proceeding without updating Redis snapshot configuration." >&2
  fi
else
  echo "Skipping Redis configuration steps."
fi

python manage.py migrate --noinput
daphne -b 0.0.0.0 -p "$PORT" --application-close-timeout 30 --ping-interval 20 --ping-timeout 10 pharmago.asgi:application

