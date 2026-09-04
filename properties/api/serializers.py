from rest_framework import serializers

from properties.models import Notification, Property, PropertyImage, PropertyRequest


class PropertyImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ['id', 'url']

    def get_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class PropertySerializer(serializers.ModelSerializer):
    property_type_display = serializers.CharField(
        source='get_property_type_display',
        read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True,
    )
    images = PropertyImageSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = [
            'id',
            'owner',
            'title',
            'description',
            'property_type',
            'property_type_display',
            'location',
            'price',
            'status',
            'status_display',
            'listed_at',
            'images',
        ]
        read_only_fields = ['id', 'owner', 'listed_at']


class PropertyCreateSerializer(serializers.ModelSerializer):
    """Create a property for the authenticated owner. Owner is never client-supplied."""

    class Meta:
        model = Property
        fields = [
            'title',
            'description',
            'property_type',
            'location',
            'price',
            'status',
        ]

    def validate_title(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Description is required.")
        return value

    def validate_location(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Location is required.")
        return value

    def validate_price(self, value):
        if value is None:
            raise serializers.ValidationError("Price is required.")
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_property_type(self, value):
        valid = {choice[0] for choice in Property.PROPERTY_TYPES}
        if value not in valid:
            raise serializers.ValidationError("Select a valid property type.")
        return value

    def validate_status(self, value):
        valid = {choice[0] for choice in Property.STATUS_CHOICES}
        if value not in valid:
            raise serializers.ValidationError("Select For Rent or For Sale.")
        return value


def _owner_display_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


def _customer_display_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


class PropertyRequestSummarySerializer(serializers.ModelSerializer):
    """Compact property payload nested inside request responses."""

    property_type_display = serializers.CharField(
        source="get_property_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    images = PropertyImageSerializer(many=True, read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "title",
            "location",
            "price",
            "status",
            "status_display",
            "property_type",
            "property_type_display",
            "images",
            "owner_name",
        ]

    def get_owner_name(self, obj):
        return _owner_display_name(obj.owner)


class PropertyRequestCreateSerializer(serializers.Serializer):
    """Customer supplies only the property id. Customer comes from the session."""

    property_id = serializers.IntegerField()

    def validate_property_id(self, value):
        try:
            Property.objects.get(pk=value)
        except Property.DoesNotExist as exc:
            raise serializers.ValidationError("Property not found.") from exc
        return value


class CustomerPropertyRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    property = PropertyRequestSummarySerializer(read_only=True)

    class Meta:
        model = PropertyRequest
        fields = [
            "id",
            "status",
            "status_display",
            "created_at",
            "updated_at",
            "property",
        ]


class OwnerPropertyRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    property = PropertyRequestSummarySerializer(read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()

    class Meta:
        model = PropertyRequest
        fields = [
            "id",
            "status",
            "status_display",
            "created_at",
            "updated_at",
            "property",
            "customer_name",
            "customer_email",
            "customer_phone",
        ]

    def get_customer_name(self, obj):
        return _customer_display_name(obj.customer)

    def get_customer_email(self, obj):
        return obj.customer.email or ""

    def get_customer_phone(self, obj):
        profile = getattr(obj.customer, "profile", None)
        return profile.phone_no if profile else ""


class PropertyRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            PropertyRequest.STATUS_ACCEPTED,
            PropertyRequest.STATUS_DECLINED,
        ]
    )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "is_read",
            "link",
            "property_request_id",
            "property_id",
            "created_at",
        ]
        read_only_fields = fields
