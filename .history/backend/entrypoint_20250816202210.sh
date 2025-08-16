#!/bin/bash
set -e

echo "Waiting for Postgres..."
python manage.py migrate --noinput
echo "Starting Django dev server..."
python manage.py runserver 0.0.0.0:8000
