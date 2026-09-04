from rest_framework import serializers

from properties.models import Conversation, Message, PropertyRequest


def _display_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_name",
            "body",
            "created_at",
            "read_at",
            "is_mine",
            "is_read",
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        return _display_name(obj.sender)

    def get_is_mine(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and obj.sender_id == user.id)

    def get_is_read(self, obj):
        """True once the recipient has read this message."""
        return obj.read_at is not None


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(value) > 5000:
            raise serializers.ValidationError(
                "Message is too long (max 5000 characters)."
            )
        return value


class ConversationPropertySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    location = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    status_display = serializers.CharField()


class ConversationParticipantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class ConversationListSerializer(serializers.ModelSerializer):
    property = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    property_request_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "property",
            "other_participant",
            "property_request_id",
            "latest_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_property(self, obj):
        prop = obj.property
        return {
            "id": prop.id,
            "title": prop.title,
            "location": prop.location,
            "price": prop.price,
            "status": prop.status,
            "status_display": prop.get_status_display(),
        }

    def get_other_participant(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        other = obj.other_participant(user) if user else None
        if not other:
            return None
        return {"id": other.id, "name": _display_name(other)}

    def get_latest_message(self, obj):
        latest = obj.messages.order_by("-created_at").first()
        if not latest:
            return None
        return MessageSerializer(latest, context=self.context).data

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return 0
        prefetched = getattr(obj, "_unread_count", None)
        if prefetched is not None:
            return prefetched
        return obj.messages.filter(read_at__isnull=True).exclude(
            sender=user
        ).count()


class ConversationDetailSerializer(ConversationListSerializer):
    messages = serializers.SerializerMethodField()

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ["messages"]

    def get_messages(self, obj):
        messages = obj.messages.select_related("sender").order_by("created_at")
        return MessageSerializer(messages, many=True, context=self.context).data


class ConversationOpenSerializer(serializers.Serializer):
    """Open/create a conversation from an existing PropertyRequest only."""

    property_request_id = serializers.IntegerField()

    def validate_property_request_id(self, value):
        try:
            property_request = PropertyRequest.objects.select_related(
                "property",
                "property__owner",
                "customer",
            ).get(pk=value)
        except PropertyRequest.DoesNotExist as exc:
            raise serializers.ValidationError(
                "Property request not found."
            ) from exc
        self.context["property_request"] = property_request
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        property_request = self.context["property_request"]

        is_customer = property_request.customer_id == user.id
        is_owner = property_request.property.owner_id == user.id

        if not (is_customer or is_owner):
            raise serializers.ValidationError(
                {
                    "property_request_id": (
                        "You can only open a conversation for a request "
                        "you are part of."
                    )
                }
            )

        if property_request.status != PropertyRequest.STATUS_ACCEPTED:
            raise serializers.ValidationError(
                {
                    "property_request_id": (
                        "Messaging is only available after the request "
                        "is accepted."
                    )
                }
            )

        attrs["property_request"] = property_request
        return attrs
