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

# Optional: seed superuser on first run (uncomment & adjust)
# echo "from django.contrib.auth import get_user_model; U=get_user_model(); \
# import os; u=os.environ.get('DJANGO_SUPERUSER_EMAIL','admin@example.com'); \
# p=os.environ.get('DJANGO_SUPERUSER_PASSWORD','admin123'); \
# U.objects.filter(email=u).exists() or U.objects.create_superuser(username=u,email=u,password=p)" \
# | python manage.py shell

echo "Starting Django dev server..."
python manage.py runserver 0.0.0.0:8000
