#!/usr/bin/env bash
# Render build step — install deps, collect static assets, apply migrations.
# Safe to run on the cloud host; do not use this to mutate local SQLite.
set -o errexit
set -o pipefail

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
