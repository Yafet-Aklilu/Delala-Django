from django.contrib import admin
from .models import Property, PropertyImage, Profile

class PropertyImageInline(admin.TabularInline):  # Allows adding images inside property admin
    model = PropertyImage
    extra = 1  # Show at least one image field

class PropertyAdmin(admin.ModelAdmin):
    inlines = [PropertyImageInline]  # Add images inside Property admin panel

admin.site.register(Property, PropertyAdmin)
admin.site.register(Profile)
