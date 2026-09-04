from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from properties.models import Conversation, Message, Notification, PropertyRequest

from .message_serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    ConversationOpenSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)


def _conversation_queryset():
    return Conversation.objects.select_related(
        "property",
        "property__owner",
        "customer",
        "owner",
        "property_request",
    )


def _messaging_allowed(conversation: Conversation) -> bool:
    """Conversations are only usable while the linked request stays accepted."""
    property_request = conversation.property_request
    return bool(
        property_request
        and property_request.status == PropertyRequest.STATUS_ACCEPTED
    )


def _messaging_forbidden_response():
    return Response(
        {
            "detail": (
                "Messaging is only available for accepted property requests."
            )
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def _conversations_for_user(user):
    return (
        _conversation_queryset()
        .filter(Q(customer=user) | Q(owner=user))
        .filter(property_request__status=PropertyRequest.STATUS_ACCEPTED)
        .annotate(
            _unread_count=Count(
                "messages",
                filter=Q(messages__read_at__isnull=True)
                & ~Q(messages__sender=user),
            ),
        )
        .order_by("-updated_at")
    )


def _get_participant_conversation(user, pk):
    try:
        conversation = _conversation_queryset().get(pk=pk)
    except Conversation.DoesNotExist:
        return None
    if not conversation.is_participant(user):
        return None
    return conversation


def _notify_message(*, recipient, sender, conversation, body):
    preview = body if len(body) <= 120 else f"{body[:117]}..."
    sender_name = (
        f"{sender.first_name} {sender.last_name}".strip() or sender.username
    )
    profile = getattr(recipient, "profile", None)
    if profile and profile.user_type == "owner":
        link = f"/owner/messages?c={conversation.id}"
    elif profile and profile.user_type == "customer":
        link = f"/customer/messages?c={conversation.id}"
    else:
        link = f"/messages?c={conversation.id}"

    return Notification.objects.create(
        recipient=recipient,
        title="New message",
        message=f"{sender_name}: {preview}",
        link=link,
        property_request=conversation.property_request,
        property=conversation.property,
    )


class ConversationListCreateAPIView(APIView):
    """
    GET  /api/messages/conversations/ — list mine (accepted-request only)
    POST /api/messages/conversations/ — open/create from accepted PropertyRequest
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _conversations_for_user(request.user)
        data = ConversationListSerializer(
            qs,
            many=True,
            context={"request": request},
        ).data
        return Response(data)

    def post(self, request):
        serializer = ConversationOpenSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        property_request = serializer.validated_data["property_request"]
        property_obj = property_request.property

        conversation, created = Conversation.objects.get_or_create(
            property=property_obj,
            customer=property_request.customer,
            defaults={
                "owner": property_obj.owner,
                "property_request": property_request,
            },
        )
        if (
            not created
            and conversation.property_request_id is None
            and property_request is not None
        ):
            conversation.property_request = property_request
            conversation.save(update_fields=["property_request", "updated_at"])

        # Re-check: existing conversation only usable if request is accepted.
        conversation = _conversation_queryset().get(pk=conversation.pk)
        if not _messaging_allowed(conversation):
            return _messaging_forbidden_response()

        data = ConversationDetailSerializer(
            conversation,
            context={"request": request},
        ).data
        data["created"] = created
        return Response(
            data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConversationDetailAPIView(APIView):
    """GET /api/messages/conversations/<id>/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        conversation = _get_participant_conversation(request.user, pk)
        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not _messaging_allowed(conversation):
            return _messaging_forbidden_response()
        data = ConversationDetailSerializer(
            conversation,
            context={"request": request},
        ).data
        return Response(data)


class ConversationMessageCreateAPIView(APIView):
    """POST /api/messages/conversations/<id>/messages/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = _get_participant_conversation(request.user, pk)
        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not _messaging_allowed(conversation):
            return _messaging_forbidden_response()

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data["body"]

        with transaction.atomic():
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                body=body,
            )
            Conversation.objects.filter(pk=conversation.pk).update(
                updated_at=timezone.now()
            )
            recipient = conversation.other_participant(request.user)
            if recipient:
                _notify_message(
                    recipient=recipient,
                    sender=request.user,
                    conversation=conversation,
                    body=body,
                )

        data = MessageSerializer(message, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class ConversationMarkReadAPIView(APIView):
    """
    POST /api/messages/conversations/<id>/read/

    Marks messages sent by the other participant as read for the current user.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = _get_participant_conversation(request.user, pk)
        if conversation is None:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not _messaging_allowed(conversation):
            return _messaging_forbidden_response()

        now = timezone.now()
        updated = (
            Message.objects.filter(
                conversation=conversation,
                read_at__isnull=True,
            )
            .exclude(sender=request.user)
            .update(read_at=now)
        )

        unread_count = (
            Message.objects.filter(
                conversation=conversation,
                read_at__isnull=True,
            )
            .exclude(sender=request.user)
            .count()
        )

        return Response({"updated": updated, "unread_count": unread_count})
