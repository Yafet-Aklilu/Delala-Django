from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import Notification

from .serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    """GET /api/notifications/ — authenticated user's notifications."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user).order_by(
            "-created_at"
        )[:50]
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()
        return Response(
            {
                "unread_count": unread_count,
                "notifications": NotificationSerializer(qs, many=True).data,
            }
        )


class NotificationMarkReadAPIView(APIView):
    """
    POST /api/notifications/mark-read/
    Body: { "ids": [1, 2] } or { "all": true }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        mark_all = bool(request.data.get("all"))
        ids = request.data.get("ids") or []

        qs = Notification.objects.filter(recipient=request.user, is_read=False)

        if mark_all:
            updated = qs.update(is_read=True)
        elif isinstance(ids, list) and ids:
            updated = qs.filter(id__in=ids).update(is_read=True)
        else:
            return Response(
                {"detail": "Provide notification ids or set all to true."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()
        return Response({"updated": updated, "unread_count": unread_count})
