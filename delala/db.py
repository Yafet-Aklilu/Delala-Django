"""Database configuration helpers (stdlib only)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse


def databases_from_env(base_dir: Path) -> dict[str, dict[str, Any]]:
    """
    Use PostgreSQL when DATABASE_URL is set; otherwise local SQLite.

    Supports postgres:// and postgresql:// URLs (Render uses either).
    """
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        return {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": base_dir / "db.sqlite3",
            }
        }

    # Django expects postgresql://; Render often provides postgres://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    parsed = urlparse(url)
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise ValueError(
            f"Unsupported DATABASE_URL scheme {parsed.scheme!r}; "
            "expected postgresql:// or postgres://"
        )

    name = unquote(parsed.path.lstrip("/"))
    if not name:
        raise ValueError("DATABASE_URL is missing a database name.")

    config: dict[str, Any] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": name,
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or ""),
        "CONN_MAX_AGE": int(
            (os.environ.get("DJANGO_DB_CONN_MAX_AGE") or "600").strip() or "600"
        ),
    }

    # Render Postgres expects SSL; override with DJANGO_DB_SSLMODE=disable for local PG.
    sslmode = (os.environ.get("DJANGO_DB_SSLMODE") or "require").strip()
    if sslmode:
        config["OPTIONS"] = {"sslmode": sslmode}

    return {"default": config}
