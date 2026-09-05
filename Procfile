# Render / production process definitions.
# Build Command (Render dashboard): `bash bin/render_build.sh`
# Start Command: use the `web` process below (or paste it into the dashboard).

web: gunicorn delala.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
