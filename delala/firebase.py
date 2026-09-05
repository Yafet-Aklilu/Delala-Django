"""Firebase Admin helpers for Delala session exchange.

Credentials stay server-side via environment variables. Never expose Admin
credentials to the frontend.
"""

from __future__ import annotations

import threading
from typing import Any

from django.conf import settings

_lock = threading.Lock()
_initialized = False


class FirebaseAuthError(Exception):
    """Safe, client-facing Firebase verification failure."""

    def __init__(self, code: str, message: str, *, status: int = 401):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def firebase_configured() -> bool:
    path = (getattr(settings, "FIREBASE_CREDENTIALS_FILE", "") or "").strip()
    raw_json = (getattr(settings, "FIREBASE_CREDENTIALS_JSON", "") or "").strip()
    return bool(path or raw_json)


def _load_certificate(credentials_module):
    """Build Admin credentials from JSON env (PaaS) or local file path."""
    raw_json = (getattr(settings, "FIREBASE_CREDENTIALS_JSON", "") or "").strip()
    if raw_json:
        import json

        return credentials_module.Certificate(json.loads(raw_json))

    path = (getattr(settings, "FIREBASE_CREDENTIALS_FILE", "") or "").strip()
    return credentials_module.Certificate(path)


def _ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return

    with _lock:
        if _initialized:
            return

        if not firebase_configured():
            raise FirebaseAuthError(
                "firebase_not_configured",
                "Firebase authentication is not configured on the server.",
                status=503,
            )

        try:
            import firebase_admin
            from firebase_admin import credentials
        except ImportError as exc:
            raise FirebaseAuthError(
                "firebase_unavailable",
                "Firebase authentication is temporarily unavailable.",
                status=503,
            ) from exc

        try:
            if not firebase_admin._apps:
                cred = _load_certificate(credentials)
                options = {}
                project_id = (getattr(settings, "FIREBASE_PROJECT_ID", "") or "").strip()
                if project_id:
                    options["projectId"] = project_id
                firebase_admin.initialize_app(cred, options or None)
            _initialized = True
        except FirebaseAuthError:
            raise
        except Exception as exc:
            raise FirebaseAuthError(
                "firebase_init_failed",
                "Firebase authentication could not be initialized.",
                status=503,
            ) from exc


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """
    Verify a Firebase ID token with the Admin SDK.

    Returns the decoded claims dict. Raises FirebaseAuthError on failure.
    Never accepts client-supplied identity without verification.
    """
    token = (id_token or "").strip()
    if not token:
        raise FirebaseAuthError(
            "missing_token",
            "Firebase ID token is required.",
            status=400,
        )

    _ensure_initialized()

    try:
        from firebase_admin import auth
        from firebase_admin.auth import (
            CertificateFetchError,
            ExpiredIdTokenError,
            InvalidIdTokenError,
            RevokedIdTokenError,
            UserDisabledError,
        )
    except ImportError as exc:
        raise FirebaseAuthError(
            "firebase_unavailable",
            "Firebase authentication is temporarily unavailable.",
            status=503,
        ) from exc

    try:
        decoded = auth.verify_id_token(token, check_revoked=True)
    except ExpiredIdTokenError as exc:
        raise FirebaseAuthError(
            "token_expired",
            "Firebase ID token has expired.",
            status=401,
        ) from exc
    except RevokedIdTokenError as exc:
        raise FirebaseAuthError(
            "token_revoked",
            "Firebase ID token has been revoked.",
            status=401,
        ) from exc
    except UserDisabledError as exc:
        raise FirebaseAuthError(
            "user_disabled",
            "This Firebase account is disabled.",
            status=403,
        ) from exc
    except InvalidIdTokenError as exc:
        raise FirebaseAuthError(
            "invalid_token",
            "Firebase ID token is invalid.",
            status=401,
        ) from exc
    except CertificateFetchError as exc:
        raise FirebaseAuthError(
            "firebase_unavailable",
            "Firebase authentication is temporarily unavailable.",
            status=503,
        ) from exc
    except Exception as exc:
        raise FirebaseAuthError(
            "invalid_token",
            "Firebase ID token could not be verified.",
            status=401,
        ) from exc

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise FirebaseAuthError(
            "invalid_token",
            "Firebase ID token is missing a user id.",
            status=401,
        )

    project_id = (getattr(settings, "FIREBASE_PROJECT_ID", "") or "").strip()
    if project_id:
        audience = decoded.get("aud")
        if audience != project_id:
            raise FirebaseAuthError(
                "invalid_token",
                "Firebase ID token is not valid for this project.",
                status=401,
            )

    return decoded
