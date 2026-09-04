from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()

def get_default_owner():
    """Returns the first user in the database to avoid migration issues."""
    try:
        return User.objects.first().id  # Set the first user as default if available
    except (User.DoesNotExist, ObjectDoesNotExist):
        return None  

class Profile(models.Model):
    USER_TYPES = [
        ('owner', 'Property Owner'),
        ('customer', 'Customer'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    user_type = models.CharField(max_length=10, choices=USER_TYPES)
    phone_no = models.CharField(max_length=15, unique=True)  # Ensure unique phone numbers

    def __str__(self):
        return f"{self.user.username} - {self.user_type}"

class Property(models.Model):
    PROPERTY_TYPES = [
        ('house', 'House'),
        ('apartment', 'Apartment'),
        ('office', 'Office'),
        ('shop', 'Shop'),
    ]
    STATUS_CHOICES = [
        ('sale', 'For Sale'),
        ('rent', 'For Rent')
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, default=get_default_owner, related_name="properties")
    title = models.CharField(max_length=200)
    description = models.TextField()
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)
    location = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sale')
    listed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class PropertyImage(models.Model):
    """Allows multiple images to be uploaded for each property."""
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="property_images/")

    def __str__(self):
        return f"Image for {self.property.title}"


class PropertyRequest(models.Model):
    """A customer inquiry for a specific property. Owner is derived via property.owner."""

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_DECLINED = "declined"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_DECLINED, "Declined"),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="requests",
    )
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="property_requests",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "-created_at"]),
            models.Index(fields=["property", "-created_at"]),
            models.Index(fields=["status"]),
        ]
        constraints = [
            # One active (pending) request per customer–property pair.
            models.UniqueConstraint(
                fields=["property", "customer"],
                condition=models.Q(status="pending"),
                name="unique_pending_request_per_customer_property",
            ),
        ]

    def __str__(self):
        return f"Request #{self.pk} — {self.customer} → {self.property}"


class Notification(models.Model):
    """In-app database notification. No email/push/WebSocket yet."""

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, default="")
    property_request = models.ForeignKey(
        PropertyRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"{self.title} → {self.recipient_id}"


class Conversation(models.Model):
    """
    Private 1:1 thread between a customer and a property owner about a listing.
    Participants are derived from PropertyRequest — never client-supplied freely.
    """

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_conversations",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owner_conversations",
    )
    property_request = models.ForeignKey(
        PropertyRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["customer", "-updated_at"]),
            models.Index(fields=["owner", "-updated_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["property", "customer"],
                name="unique_conversation_per_customer_property",
            ),
        ]

    def __str__(self):
        return f"Conversation #{self.pk} — {self.property_id}"

    def is_participant(self, user) -> bool:
        if not user or not user.is_authenticated:
            return False
        return user.id in {self.customer_id, self.owner_id}

    def other_participant(self, user):
        if user.id == self.customer_id:
            return self.owner
        if user.id == self.owner_id:
            return self.customer
        return None


class Message(models.Model):
    """
    One message in a conversation.

    read_at is set when the *recipient* (non-sender) has read the message.
    Unread for the current user = messages where sender != user and read_at is null.
    """

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["conversation", "read_at"]),
        ]

    def __str__(self):
        return f"Message #{self.pk} in conversation {self.conversation_id}"
