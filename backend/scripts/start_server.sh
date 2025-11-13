#!/bin/bash
set -euo pipefail

configure_redis_snapshot_policy() {
  local attempt args

  if [[ -n "${REDIS_URL:-}" ]]; then
    args=(-u "$REDIS_URL")
  elif [[ -n "${REDIS_HOST:-}" ]] && [[ -n "${REDIS_PORT:-}" ]]; then
    args=(-h "$REDIS_HOST" -p "$REDIS_PORT")
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
      args+=(-a "$REDIS_PASSWORD")
    fi
  else
    echo "Redis connection details not provided; skipping snapshot configuration."
    return 0
  fi

  for attempt in {1..5}; do
    if redis-cli "${args[@]}" CONFIG SET save "86400 1"; then
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

# Configure Redis snapshot frequency without failing the deployment if Redis is unavailable.
if ! configure_redis_snapshot_policy; then
  echo "Proceeding without updating Redis snapshot configuration." >&2
fi

python manage.py migrate --noinput
daphne -b 0.0.0.0 -p "$PORT" --application-close-timeout 30 --ping-interval 20 --ping-timeout 10 pharmago.asgi:application

