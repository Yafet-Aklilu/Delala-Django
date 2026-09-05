from pathlib import Path
import os

from django.core.exceptions import ImproperlyConfigured

from delala.db import databases_from_env
from delala.env import env_bool, env_csv, env_int, load_env_file
from delala.storage import apply_s3_media_settings, use_s3_media

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load project-root .env into os.environ (does not override already-exported vars).
# Django does not read .env by itself — this is required for local FIREBASE_* etc.
load_env_file(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Core security — environment-driven with local-development defaults
# ---------------------------------------------------------------------------

# Local default matches historical behavior when DJANGO_DEBUG is unset.
DEBUG = env_bool("DJANGO_DEBUG", default=True)

# Production MUST set DJANGO_SECRET_KEY. Local DEBUG keeps a dev-only fallback.
_secret_key = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if _secret_key:
    SECRET_KEY = _secret_key
elif DEBUG:
    # Development-only fallback — never rely on this outside local DEBUG.
    SECRET_KEY = (
        "django-insecure-2%5wbb65321(olt+r$&k5+8ba!+p$v$gulol%w=9v%n!$&8ut$"
    )
else:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is False."
    )

ALLOWED_HOSTS = env_csv(
    "DJANGO_ALLOWED_HOSTS",
    ["127.0.0.1", "localhost"],
)

# Frontend origins allowed for credentialed CORS (comma-separated in prod).
CORS_ALLOWED_ORIGINS = env_csv(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
)

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "storages",
    "properties",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "delala.cors.DevCorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CSRF — keep middleware enabled; trusted origins are env-driven.
CSRF_TRUSTED_ORIGINS = env_csv(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
)

# Cookie flags — local HTTP defaults; Vercel + Render (cross-site) needs
# Secure=True and SameSite=None (set via env — see .env.example).
_session_samesite = (
    os.environ.get("DJANGO_SESSION_COOKIE_SAMESITE", "Lax").strip() or "Lax"
)
_csrf_samesite = (
    os.environ.get("DJANGO_CSRF_COOKIE_SAMESITE", "Lax").strip() or "Lax"
)
# Browsers require the literal token "None" (capital N).
SESSION_COOKIE_SAMESITE = (
    "None" if _session_samesite.lower() == "none" else _session_samesite
)
CSRF_COOKIE_SAMESITE = "None" if _csrf_samesite.lower() == "none" else _csrf_samesite
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", default=False)
CSRF_COOKIE_HTTPONLY = False

# SameSite=None requires Secure cookies (browsers reject otherwise).
if SESSION_COOKIE_SAMESITE == "None" and not SESSION_COOKIE_SECURE:
    raise ImproperlyConfigured(
        "DJANGO_SESSION_COOKIE_SAMESITE=None requires "
        "DJANGO_SESSION_COOKIE_SECURE=True."
    )
if CSRF_COOKIE_SAMESITE == "None" and not CSRF_COOKIE_SECURE:
    raise ImproperlyConfigured(
        "DJANGO_CSRF_COOKIE_SAMESITE=None requires DJANGO_CSRF_COOKIE_SECURE=True."
    )

# HTTPS-related settings — all off by default so local HTTP keeps working.
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=False,
)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = env_bool(
    "DJANGO_SECURE_CONTENT_TYPE_NOSNIFF",
    default=True,
)

# When behind a TLS-terminating proxy (Render), set DJANGO_SECURE_PROXY_SSL_HEADER=1
# so Django trusts X-Forwarded-Proto. Leave unset for plain local HTTP.
if env_bool("DJANGO_SECURE_PROXY_SSL_HEADER", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
}

ROOT_URLCONF = "delala.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "delala.wsgi.application"

# Database — PostgreSQL via DATABASE_URL; SQLite fallback for local development.
try:
    DATABASES = databases_from_env(BASE_DIR)
except ValueError as exc:
    raise ImproperlyConfigured(str(exc)) from exc

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files — WhiteNoise serves STATIC_ROOT in production
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
_static_dir = BASE_DIR / "static"
STATICFILES_DIRS = [_static_dir] if _static_dir.is_dir() else []

# ---------------------------------------------------------------------------
# Media — local disk in development; Cloudflare R2 (S3 API) when enabled
# ---------------------------------------------------------------------------
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

if use_s3_media():
    try:
        apply_s3_media_settings(globals())
    except ValueError as exc:
        raise ImproperlyConfigured(str(exc)) from exc
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Keep cookies on the API host; frontend sends them with credentials: 'include'
SESSION_COOKIE_NAME = "delala_sessionid"
CSRF_COOKIE_NAME = "delala_csrftoken"

# ---------------------------------------------------------------------------
# Firebase Admin (server-only) — used for ID-token → Django session exchange
# ---------------------------------------------------------------------------
# Prefer FIREBASE_CREDENTIALS_JSON on PaaS (Render); file path works locally.
# Never commit credentials; never use NEXT_PUBLIC_* for Admin keys.
_firebase_creds = os.environ.get("FIREBASE_CREDENTIALS_FILE", "").strip()
if _firebase_creds and not os.path.isabs(_firebase_creds):
    _firebase_creds = str((BASE_DIR / _firebase_creds).resolve())
FIREBASE_CREDENTIALS_FILE = _firebase_creds
FIREBASE_CREDENTIALS_JSON = os.environ.get("FIREBASE_CREDENTIALS_JSON", "").strip()
# Optional project id check against the token "aud" claim.
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "").strip()
