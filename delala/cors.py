"""Minimal development CORS for the Next.js frontend on :3000."""

from django.http import HttpResponse


ALLOWED_ORIGINS = {
    "http://127.0.0.1:3000",
    "http://localhost:3000",
}


class DevCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")

        if request.method == "OPTIONS" and origin in ALLOWED_ORIGINS:
            response = HttpResponse()
            self._apply_cors(response, origin)
            return response

        response = self.get_response(request)
        if origin in ALLOWED_ORIGINS:
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
