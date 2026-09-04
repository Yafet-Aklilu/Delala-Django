from django.contrib import admin
from .models import (
    Conversation,
    Message,
    Notification,
    Profile,
    Property,
    PropertyImage,
    PropertyRequest,
)


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1


class PropertyAdmin(admin.ModelAdmin):
    inlines = [PropertyImageInline]
    list_display = ("title", "owner", "status", "location", "listed_at")


@admin.register(PropertyRequest)
class PropertyRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "property", "customer", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("property__title", "customer__username", "customer__email")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "title", "is_read", "created_at")
    list_filter = ("is_read",)


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("sender", "body", "created_at", "read_at")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "property", "customer", "owner", "updated_at")
    search_fields = ("property__title", "customer__username", "owner__username")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "read_at")
    search_fields = ("body", "sender__username")


admin.site.register(Property, PropertyAdmin)
admin.site.register(Profile)
