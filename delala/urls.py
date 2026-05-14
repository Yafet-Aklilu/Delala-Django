from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from properties.views import home  # Import home view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('properties.urls')),  # Includes all URLs from properties app
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
