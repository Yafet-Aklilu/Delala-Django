"""CORS middleware for the Next.js frontend (credentialed, origin allowlist).

Origins come from Django settings (`CORS_ALLOWED_ORIGINS`), which are
environment-driven with localhost:3000 defaults for local development.
"""

from django.conf import settings
from django.http import HttpResponse


def _allowed_origins() -> set[str]:
    origins = getattr(settings, "CORS_ALLOWED_ORIGINS", None) or []
    return {origin for origin in origins if origin}


class DevCorsMiddleware:
    """Allowlisted CORS with credentials. Name kept for existing MIDDLEWARE path."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allowed = _allowed_origins()

        if request.method == "OPTIONS" and origin in allowed:
            response = HttpResponse()
            self._apply_cors(response, origin)
            return response

        response = self.get_response(request)
        if origin in allowed:
            self._apply_cors(response, origin)
        return response

    @staticmethod
    def _apply_cors(response, origin: str) -> None:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Headers"] = (
            "Accept, Content-Type, X-CSRFToken, X-Requested-With"
        )
        response["Access-Control-Allow-Methods"] = (
            "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        )
        response["Access-Control-Max-Age"] = "86400"
        response["Vary"] = "Origin"
