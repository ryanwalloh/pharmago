#!/usr/bin/env bash
set -e

echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."
until python - <<'PY'
import os, socket, time
host=os.environ.get("DB_HOST","postgres")
port=int(os.environ.get("DB_PORT","5432"))
s=socket.socket()
try:
    s.connect((host, port))
    print("Postgres reachable.")
except Exception as e:
    print("Postgres not ready:", e)
    raise
finally:
    s.close()
PY
do
  echo "Retrying in 2s..."
  sleep 2
done

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Starting Django dev server..."
python manage.py runserver 0.0.0.0:8000
