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
